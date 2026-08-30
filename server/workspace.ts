import { createHash } from 'node:crypto';

interface NodeRequest {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
  on(event: 'data', cb: (chunk: Buffer | string) => void): void;
  on(event: 'end', cb: () => void): void;
  on(event: 'error', cb: (error: Error) => void): void;
}

interface NodeResponse {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(body?: string): void;
}

interface DeliveryRequest {
  bookingId?: string;
  idToken?: string;
  language?: 'vi' | 'en';
  durationHours?: number;
  event?: 'reserved' | 'confirmed' | 'cancelled';
}

type FirestoreValue = {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
};

interface FirestoreDocument {
  fields?: Record<string, FirestoreValue>;
}

const attempts = new Map<string, { count: number; resetsAt: number }>();
const MAX_PER_HOUR = 8;

const clean = (name: string): string => {
  const value = process.env[name]?.trim() ?? '';
  return value.startsWith('your_') ? '' : value;
};

export function isWorkspaceDeliveryConfigured(): boolean {
  return Boolean(
    clean('FIREBASE_PROJECT_ID') &&
      clean('FIREBASE_WEB_API_KEY') &&
      clean('GOOGLE_WORKSPACE_CLIENT_ID') &&
      clean('GOOGLE_WORKSPACE_CLIENT_SECRET') &&
      clean('GOOGLE_WORKSPACE_REFRESH_TOKEN'),
  );
}

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

const base64Url = (value: string): string =>
  Buffer.from(value, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const header = (value: string): string => `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;

async function readBody(req: NodeRequest): Promise<DeliveryRequest> {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk.toString();
      if (raw.length > 32_000) reject(new Error('BODY_TOO_LARGE'));
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw || '{}') as DeliveryRequest);
      } catch {
        reject(new Error('INVALID_JSON'));
      }
    });
    req.on('error', reject);
  });
}

async function getAccessToken(): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clean('GOOGLE_WORKSPACE_CLIENT_ID'),
      client_secret: clean('GOOGLE_WORKSPACE_CLIENT_SECRET'),
      refresh_token: clean('GOOGLE_WORKSPACE_REFRESH_TOKEN'),
      grant_type: 'refresh_token',
    }),
  });
  if (!response.ok) throw new Error(`OAUTH_${response.status}`);
  const result = (await response.json()) as { access_token?: string };
  if (!result.access_token) throw new Error('OAUTH_NO_TOKEN');
  return result.access_token;
}

async function verifyUser(idToken: string): Promise<string> {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(clean('FIREBASE_WEB_API_KEY'))}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    },
  );
  if (!response.ok) throw new Error('UNAUTHENTICATED');
  const result = (await response.json()) as { users?: Array<{ localId?: string }> };
  const uid = result.users?.[0]?.localId;
  if (!uid) throw new Error('UNAUTHENTICATED');
  return uid;
}

async function getDocument(path: string, idToken: string): Promise<FirestoreDocument> {
  const project = clean('FIREBASE_PROJECT_ID');
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(project)}/databases/(default)/documents/${path}`,
    { headers: { Authorization: `Bearer ${idToken}` } },
  );
  if (!response.ok) throw new Error(response.status === 404 ? 'NOT_FOUND' : 'FIRESTORE_DENIED');
  return (await response.json()) as FirestoreDocument;
}

async function getBookingAfterMirror(bookingId: string, idToken: string): Promise<FirestoreDocument> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await getDocument(`bookings/${encodeURIComponent(bookingId)}`, idToken);
    } catch (error) {
      lastError = error;
      if (!(error instanceof Error) || error.message !== 'NOT_FOUND') throw error;
      await new Promise((resolve) => setTimeout(resolve, 450));
    }
  }
  throw lastError instanceof Error ? lastError : new Error('NOT_FOUND');
}

const stringField = (doc: FirestoreDocument, name: string): string => doc.fields?.[name]?.stringValue ?? '';
const numberField = (doc: FirestoreDocument, name: string): number =>
  Number(doc.fields?.[name]?.integerValue ?? doc.fields?.[name]?.doubleValue ?? 0);

function makeMessage(to: string, subject: string, html: string, messageId: string): string {
  return [
    `To: ${to}`,
    `Subject: ${header(subject)}`,
    `Message-ID: <${messageId}@visgo.app>`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    html,
  ].join('\r\n');
}

async function sendGmail(accessToken: string, raw: string): Promise<void> {
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: base64Url(raw) }),
  });
  if (!response.ok) throw new Error(`GMAIL_${response.status}`);
}

const emailShell = (title: string, content: string): string => `<!doctype html><html><body style="margin:0;background:#f5f5f4;padding:24px;font-family:Arial,sans-serif;color:#292524"><div style="max-width:600px;margin:auto;background:white;border:1px solid #e7e5e4;border-radius:16px;overflow:hidden"><div style="background:#991b1b;color:white;padding:20px 24px"><b style="font-size:22px">ViS-Go</b><div style="margin-top:8px;font-size:16px">${escapeHtml(title)}</div></div><div style="padding:24px;font-size:14px;line-height:1.65">${content}</div></div></body></html>`;

function bookingDetails(booking: FirestoreDocument): string {
  return `<div style="padding:14px;background:#fafaf9;border:1px solid #e7e5e4;border-radius:10px"><b>${escapeHtml(stringField(booking, 'tourTitleVi') || stringField(booking, 'tourTitle'))}</b><br>Ngày: ${escapeHtml(stringField(booking, 'bookingDate'))} lúc ${escapeHtml(stringField(booking, 'bookingTime'))}<br>Điểm hẹn: ${escapeHtml(stringField(booking, 'meetingPoint'))}<br>Số khách: ${numberField(booking, 'guestsCount')}<br>Trả trực tiếp cho host: ${numberField(booking, 'totalPriceVND').toLocaleString('vi-VN')} ₫</div>`;
}

function eventTimes(booking: FirestoreDocument, durationHours: number): { start: string; end: string } {
  const start = new Date(`${stringField(booking, 'bookingDate')}T${stringField(booking, 'bookingTime')}:00+07:00`);
  if (!Number.isFinite(start.getTime())) throw new Error('INVALID_SCHEDULE');
  const end = new Date(start.getTime() + Math.max(0.5, durationHours) * 3_600_000);
  return { start: start.toISOString(), end: end.toISOString() };
}

async function createHostCalendarEvent(
  accessToken: string,
  booking: FirestoreDocument,
  hostEmail: string,
  bookingId: string,
  durationHours: number,
): Promise<void> {
  const times = eventTimes(booking, durationHours);
  const eventId = createHash('sha256').update(`visgo:${bookingId}`).digest('hex').slice(0, 32);
  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: eventId,
      summary: `[ViS-Go] ${stringField(booking, 'tourTitleVi') || stringField(booking, 'tourTitle')}`,
      description: `Booking #${bookingId}\nKhách: ${stringField(booking, 'customerName')} (${stringField(booking, 'customerPhone')})`,
      location: stringField(booking, 'meetingPoint'),
      start: { dateTime: times.start, timeZone: 'Asia/Ho_Chi_Minh' },
      end: { dateTime: times.end, timeZone: 'Asia/Ho_Chi_Minh' },
      attendees: [{ email: hostEmail }],
      reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 60 }] },
    }),
  });
  // A retry sees the deterministic event id and must not create a duplicate.
  if (!response.ok && response.status !== 409) throw new Error(`CALENDAR_${response.status}`);
}

export async function handleBookingDelivery(body: DeliveryRequest): Promise<Record<string, unknown>> {
  if (!isWorkspaceDeliveryConfigured()) return { ok: false, reason: 'WORKSPACE_NOT_CONFIGURED' };
  const bookingId = body.bookingId?.trim() ?? '';
  const idToken = body.idToken?.trim() ?? '';
  const event = body.event;
  if (!bookingId || !idToken || !event || !['reserved', 'confirmed', 'cancelled'].includes(event)) {
    return { ok: false, reason: 'BAD_REQUEST' };
  }

  const uid = await verifyUser(idToken);
  const booking = await getBookingAfterMirror(bookingId, idToken);
  const customerId = stringField(booking, 'customerId');
  const hostId = stringField(booking, 'hostId');
  if ((event === 'confirmed' ? hostId : customerId) !== uid) throw new Error('FORBIDDEN');
  const expectedStatus = event === 'reserved' ? 'pending' : event === 'confirmed' ? 'confirmed' : 'cancelled';
  if (stringField(booking, 'status') !== expectedStatus) throw new Error('INVALID_BOOKING_STATE');

  const host = await getDocument(`profiles/${encodeURIComponent(hostId)}`, idToken);
  const customerEmail = stringField(booking, 'customerEmail');
  const hostEmail = stringField(host, 'email');
  if (!customerEmail || !hostEmail) throw new Error('RECIPIENT_EMAIL_MISSING');

  const token = await getAccessToken();
  const details = bookingDetails(booking);
  const customerName = escapeHtml(stringField(booking, 'customerName'));
  const hostName = escapeHtml(stringField(booking, 'hostName'));
  const content = event === 'reserved'
    ? {
        customerTitle: 'Đã ghi nhận đặt chỗ trước',
        customerSubject: `[ViS-Go] Đặt chỗ trước #${bookingId}`,
        customerBody: `<p>Xin chào <b>${customerName}</b>,</p><p>Yêu cầu đặt chỗ trước đã được ghi nhận và đang chờ <b>${hostName}</b> sắp xếp. Hai bên có thể trao đổi trực tiếp; ViS-Go chưa ghi nhận thanh toán.</p>${details}`,
        hostTitle: 'Có khách đặt chỗ trước',
        hostSubject: `[ViS-Go Host] Yêu cầu mới #${bookingId}`,
        hostBody: `<p>Xin chào <b>${hostName}</b>,</p><p><b>${customerName}</b> vừa đặt chỗ trước. Hãy trao đổi lịch trình; chỉ bấm xác nhận sau khi hai bên đã tự thỏa thuận và bạn đã tự kiểm tra khoản thanh toán.</p>${details}`,
      }
    : event === 'confirmed'
      ? {
          customerTitle: 'Host đã xác nhận chuyến đi',
          customerSubject: `[ViS-Go] Biên nhận xác nhận #${bookingId}`,
          customerBody: `<p>Xin chào <b>${customerName}</b>,</p><p><b>${hostName}</b> đã xác nhận chuyến đi. Đây là biên nhận lịch trình; ViS-Go không thu hoặc xác minh khoản chuyển tiền giữa hai bên.</p>${details}`,
          hostTitle: 'Bạn đã xác nhận chuyến đi',
          hostSubject: `[ViS-Go Host] Đã xác nhận #${bookingId}`,
          hostBody: `<p>Xin chào <b>${hostName}</b>,</p><p>Booking với <b>${customerName}</b> đã được xác nhận và lịch đã được thêm vào Google Calendar của tài khoản vận hành ViS-Go.</p>${details}`,
        }
      : {
          customerTitle: 'Đã hủy đặt chỗ trước',
          customerSubject: `[ViS-Go] Đã hủy #${bookingId}`,
          customerBody: `<p>Xin chào <b>${customerName}</b>,</p><p>Yêu cầu đặt chỗ trước đã được hủy theo yêu cầu của bạn.</p>${details}`,
          hostTitle: 'Khách đã hủy đặt chỗ trước',
          hostSubject: `[ViS-Go Host] Khách đã hủy #${bookingId}`,
          hostBody: `<p>Xin chào <b>${hostName}</b>,</p><p><b>${customerName}</b> đã hủy yêu cầu đặt chỗ trước. Tour đã được mở lại cho khách khác.</p>${details}`,
        };

  const customerHtml = emailShell(content.customerTitle, content.customerBody);
  const hostHtml = emailShell(content.hostTitle, content.hostBody);

  const deliveries: Promise<void>[] = [
    sendGmail(token, makeMessage(customerEmail, content.customerSubject, customerHtml, `${bookingId}-${event}-customer`)),
    sendGmail(token, makeMessage(hostEmail, content.hostSubject, hostHtml, `${bookingId}-${event}-host`)),
  ];
  if (event === 'confirmed') {
    deliveries.push(createHostCalendarEvent(token, booking, hostEmail, bookingId, body.durationHours ?? 3));
  }
  await Promise.all(deliveries);

  return { ok: true, customerEmailSent: true, hostEmailSent: true, hostCalendarInvited: event === 'confirmed' };
}

export async function bookingDeliveryEndpoint(req: NodeRequest, res: NodeResponse): Promise<void> {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, reason: 'METHOD_NOT_ALLOWED' }));
    return;
  }

  const ip = String(req.headers?.['x-forwarded-for'] ?? req.socket?.remoteAddress ?? 'unknown').split(',')[0].trim();
  const now = Date.now();
  const bucket = attempts.get(ip);
  if (bucket && bucket.resetsAt > now && bucket.count >= MAX_PER_HOUR) {
    res.statusCode = 429;
    res.end(JSON.stringify({ ok: false, reason: 'RATE_LIMITED' }));
    return;
  }
  attempts.set(ip, bucket && bucket.resetsAt > now ? { ...bucket, count: bucket.count + 1 } : { count: 1, resetsAt: now + 3_600_000 });

  try {
    const result = await handleBookingDelivery(await readBody(req));
    res.statusCode = result.ok ? 200 : 503;
    res.end(JSON.stringify(result));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[ViS-Go Workspace] Booking delivery failed:', message);
    res.statusCode = /UNAUTHENTICATED|FORBIDDEN|FIRESTORE_DENIED/.test(message) ? 403 : 502;
    res.end(JSON.stringify({ ok: false, reason: message }));
  }
}
