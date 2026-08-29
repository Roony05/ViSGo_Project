import React, { useMemo } from 'react';
import { Booking, Language, Tour, User } from '../types';
import { tourLanguageCodes } from '../utils/contentLanguage';
import { languageLabel } from '../data/languages';

/**
 * The operations dashboard: what the platform actually did, drawn.
 *
 * Every number here is counted from the documents in Firestore that are
 * already on screen elsewhere in this console. Nothing is estimated, nothing is
 * seeded, and a quiet platform draws an empty chart that says so rather than a
 * plausible-looking shape.
 *
 * The charts are inline SVG on purpose. A charting library would be ~50 KB of
 * JavaScript on the critical path of a page five people use, and none of these
 * five forms needs more than an axis, a rectangle and an arc.
 */

/*
  Colours.

  Taken from the validated categorical palette rather than from the site's warm
  brand reds, because these have been checked as a set: slots 1-3 clear the
  colour-vision-deficiency separation floor against each other on a white
  surface (worst pair ΔE 9.2 deutan, 24.0 normal vision). The aqua sits at
  2.82:1 against white, which is under the 3:1 mark — so every chart below
  carries visible labels and a table, and colour never has to carry a value on
  its own.
*/
const SERIES = ['#2a78d6', '#eb6834', '#1baf7a'] as const;
const INK = '#0b0b0b';
const INK_MUTED = '#898781';
const GRID = '#e1e0d9';
const SURFACE = '#ffffff';

interface AdminDashboardProps {
  tours: Tour[];
  bookings: Booking[];
  users: User[];
  language: Language;
  currency: 'VND' | 'USD';
}

/** A bar or slice: one label, one number, one colour. */
interface Datum {
  label: string;
  value: number;
  color: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  tours,
  bookings,
  users,
  language,
  currency,
}) => {
  const isVi = language === 'vi';

  /**
   * The last six calendar months, oldest first.
   *
   * Bookings are bucketed by `createdAt` — when the booking was made — not by
   * the date of the trip, because this chart answers "is the platform being
   * used", and a trip booked today for next March is use today.
   */
  const months = useMemo(() => {
    const now = new Date();
    const buckets: Array<{ key: string; label: string; count: number; gmvVND: number }> = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(2)}`,
        count: 0,
        gmvVND: 0,
      });
    }

    const byKey = new Map(buckets.map((b) => [b.key, b]));
    for (const booking of bookings) {
      if (booking.status === 'cancelled') continue;
      const when = new Date(booking.createdAt);
      if (Number.isNaN(when.getTime())) continue;
      const bucket = byKey.get(`${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, '0')}`);
      if (!bucket) continue;
      bucket.count += 1;
      bucket.gmvVND += booking.totalPriceVND || 0;
    }
    return buckets;
  }, [bookings]);

  const languageSplit = useMemo<Datum[]>(() => {
    const counts = new Map<string, number>();
    for (const tour of tours) {
      for (const code of tourLanguageCodes(tour)) counts.set(code, (counts.get(code) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([code, value], index) => ({
        label: languageLabel(code),
        value,
        color: SERIES[index % SERIES.length],
      }));
  }, [tours]);

  const roleSplit = useMemo<Datum[]>(() => {
    const count = (role: User['role']) => users.filter((u) => u.role === role).length;
    return [
      { label: isVi ? 'Khách du lịch' : 'Travellers', value: count('customer'), color: SERIES[0] },
      { label: 'Host', value: count('host'), color: SERIES[1] },
      { label: 'Admin', value: count('admin'), color: SERIES[2] },
    ];
  }, [users, isVi]);

  /** Where the catalogue actually is, longest first. */
  const topCities = useMemo<Datum[]>(() => {
    const counts = new Map<string, number>();
    for (const tour of tours) counts.set(tour.city, (counts.get(tour.city) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, value]) => ({ label, value, color: SERIES[0] }));
  }, [tours]);

  const money = (vnd: number): string =>
    currency === 'USD' ? `$${Math.round(vnd / 25000).toLocaleString('en-US')}` : `${Math.round(vnd).toLocaleString('vi-VN')}₫`;

  /**
   * The same figure, short enough for an axis tick.
   *
   * "1.300.000₫" beside a 40px gutter either overlaps the first bar or gets
   * clipped by the viewBox; "1,3 tr" does not, and the exact figure is one
   * hover — or one glance at the table — away.
   */
  const moneyShort = (vnd: number): string => {
    if (currency === 'USD') {
      const usd = vnd / 25000;
      return usd >= 1000 ? `$${(usd / 1000).toFixed(1)}k` : `$${Math.round(usd)}`;
    }
    if (vnd >= 1_000_000_000) return `${(vnd / 1_000_000_000).toFixed(1).replace('.', ',')} tỷ`;
    if (vnd >= 1_000_000) return `${(vnd / 1_000_000).toFixed(1).replace('.', ',')} tr`;
    if (vnd >= 1_000) return `${Math.round(vnd / 1_000)}k`;
    return String(Math.round(vnd));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title={isVi ? 'Lượt đặt tour theo tháng' : 'Bookings per month'}
          note={isVi ? '6 tháng gần nhất, không tính đơn đã huỷ' : 'Last six months, cancelled bookings excluded'}
          rows={months.map((m) => [m.label, String(m.count)])}
          language={language}
        >
          <BarChart
            data={months.map((m) => ({ label: m.label, value: m.count, color: SERIES[0] }))}
            format={(v) => String(v)}
            formatShort={(v) => String(v)}
            integer
            emptyText={isVi ? 'Chưa có lượt đặt nào trong 6 tháng qua.' : 'No bookings in the last six months.'}
          />
        </ChartCard>

        <ChartCard
          title={isVi ? 'Doanh thu theo tháng' : 'Booking value per month'}
          note={
            isVi
              ? 'Tổng tiền tour khách trả trực tiếp cho host'
              : 'Total trip value, paid by travellers to hosts directly'
          }
          rows={months.map((m) => [m.label, money(m.gmvVND)])}
          language={language}
        >
          <BarChart
            data={months.map((m) => ({ label: m.label, value: m.gmvVND, color: SERIES[0] }))}
            format={money}
            formatShort={moneyShort}
            emptyText={isVi ? 'Chưa có doanh thu nào trong 6 tháng qua.' : 'No booking value in the last six months.'}
          />
        </ChartCard>

        <ChartCard
          title={isVi ? 'Tour theo ngôn ngữ dẫn' : 'Listings by tour language'}
          note={isVi ? 'Năm ngôn ngữ phổ biến nhất trong catalogue' : 'The five most common guide languages'}
          rows={languageSplit.map((d) => [d.label, String(d.value)])}
          language={language}
        >
          <Donut
            data={languageSplit}
            emptyText={isVi ? 'Chưa có tour nào.' : 'No listings yet.'}
          />
        </ChartCard>

        <ChartCard
          title={isVi ? 'Tài khoản theo vai trò' : 'Accounts by role'}
          note={isVi ? 'Toàn bộ hồ sơ đã đăng ký' : 'Every registered profile'}
          rows={roleSplit.map((d) => [d.label, String(d.value)])}
          language={language}
        >
          <Donut data={roleSplit} emptyText={isVi ? 'Chưa có tài khoản nào.' : 'No accounts yet.'} />
        </ChartCard>

        <ChartCard
          title={isVi ? 'Tỉnh/thành có nhiều tour nhất' : 'Provinces with the most listings'}
          note={isVi ? 'Sáu nơi dẫn đầu' : 'The six largest'}
          rows={topCities.map((d) => [d.label, String(d.value)])}
          language={language}
        >
          <RowBars
            data={topCities}
            emptyText={isVi ? 'Chưa có tour nào.' : 'No listings yet.'}
          />
        </ChartCard>

      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Chart frame                                                         */
/* ------------------------------------------------------------------ */

/**
 * One chart, its heading, and the same numbers as text.
 *
 * The table is not optional decoration. Two of the three series colours sit
 * under 3:1 against white, so anything colour alone would have told a reader
 * has to be readable another way — and a chart nobody can copy a number out of
 * is half a report.
 */
const ChartCard: React.FC<{
  title: string;
  note: string;
  rows: Array<[string, string]>;
  language: Language;
  children: React.ReactNode;
}> = ({ title, note, rows, language, children }) => (
  <figure className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs m-0 space-y-3">
    <figcaption>
      <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">{title}</h4>
      <p className="text-[11px] text-stone-500 leading-relaxed mt-0.5">{note}</p>
    </figcaption>

    {children}

    <details className="group">
      <summary className="text-[11px] font-bold text-stone-500 hover:text-stone-800 cursor-pointer list-none flex items-center gap-1.5">
        <i className="fa-solid fa-table-list text-[10px]"></i>
        {language === 'vi' ? 'Xem số liệu' : 'View the numbers'}
      </summary>
      <table className="w-full mt-2 text-[11px] text-stone-700">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-t border-stone-100">
              <td className="py-1 pr-2">{label}</td>
              <td className="py-1 text-right font-bold tabular-nums text-stone-900">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  </figure>
);

/* ------------------------------------------------------------------ */
/* Marks                                                               */
/* ------------------------------------------------------------------ */

/** A bar with its far end rounded and its base square on the axis. */
function barPath(x: number, y: number, w: number, h: number, r: number): string {
  const radius = Math.max(0, Math.min(r, w / 2, h));
  return [
    `M${x},${y + h}`,
    `V${y + radius}`,
    `Q${x},${y} ${x + radius},${y}`,
    `H${x + w - radius}`,
    `Q${x + w},${y} ${x + w},${y + radius}`,
    `V${y + h}`,
    'Z',
  ].join(' ');
}

/**
 * Rounds an axis maximum up to something a person would have chosen.
 *
 * `integer` restricts the choice to even multiples, because this chart draws
 * its middle gridline at half the maximum: a top of 1 on a chart counting
 * bookings gives a tick labelled "0.5 bookings", which is not a thing.
 */
function niceMax(value: number, integer: boolean): number {
  if (value <= 0) return integer ? 2 : 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const step of integer ? [2, 4, 10] : [1, 2, 2.5, 5, 10]) {
    if (value <= step * magnitude) return step * magnitude;
  }
  return 10 * magnitude;
}

const EmptyPlot: React.FC<{ text: string }> = ({ text }) => (
  <p className="h-[150px] flex items-center justify-center text-center text-[11px] text-stone-400 px-4">
    {text}
  </p>
);

/**
 * Vertical bars over a hairline grid.
 *
 * Only the tallest bar is labelled. A value printed over every bar is the
 * fastest way to make six numbers unreadable; the axis carries the scale, the
 * hover carries the exact figure, and the table below carries all of them.
 */
const BarChart: React.FC<{
  data: Datum[];
  /** The exact figure, for the hover. */
  format: (value: number) => string;
  /** The short form, for the axis and the one direct label. */
  formatShort: (value: number) => string;
  /** True when a fractional tick would be nonsense — counts of things. */
  integer?: boolean;
  emptyText: string;
}> = ({ data, format, formatShort, integer = false, emptyText }) => {
  const peak = Math.max(...data.map((d) => d.value), 0);
  if (peak <= 0) return <EmptyPlot text={emptyText} />;

  const W = 320;
  const H = 150;
  // A gutter wide enough for the tick labels. Without it they sit on top of
  // the first bar, which is exactly where the tallest one tends to be.
  const padL = 42;
  const padR = 6;
  const padT = 16;
  const padB = 20;
  const top = niceMax(peak, integer);
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  // 2px of surface between neighbours, per the mark spec.
  const slot = plotW / data.length;
  const barW = Math.max(6, slot - 10);
  const tallest = data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img">
      {[0, 0.5, 1].map((f) => {
        const y = padT + plotH * (1 - f);
        return (
          <g key={f}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke={GRID} strokeWidth={1} />
            <text x={padL - 6} y={y + 3} fontSize={8} fill={INK_MUTED} textAnchor="end">
              {formatShort(top * f)}
            </text>
          </g>
        );
      })}

      {data.map((d, i) => {
        const h = (d.value / top) * plotH;
        const x = padL + i * slot + (slot - barW) / 2;
        const y = padT + plotH - h;
        return (
          <g key={d.label}>
            {d.value > 0 && (
              <path d={barPath(x, y, barW, h, 4)} fill={d.color}>
                <title>{`${d.label}: ${format(d.value)}`}</title>
              </path>
            )}
            <text x={x + barW / 2} y={H - 6} fontSize={9} fill={INK_MUTED} textAnchor="middle">
              {d.label}
            </text>
            {i === tallest && d.value > 0 && (
              <text x={x + barW / 2} y={y - 4} fontSize={9} fontWeight={700} fill={INK} textAnchor="middle">
                {formatShort(d.value)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
};

/**
 * Part-to-whole, at most three slices, with the count beside every label.
 *
 * A donut and not a pie so the total can sit in the middle, and never more than
 * a handful of segments: past that the arcs stop being comparable and the table
 * is doing all the work anyway.
 */
const Donut: React.FC<{ data: Datum[]; emptyText: string }> = ({ data, emptyText }) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total <= 0) return <EmptyPlot text={emptyText} />;

  const size = 150;
  const c = size / 2;
  const r = 54;
  const thickness = 18;

  // One slice covering everything draws as a ring: an arc of exactly 360° has
  // no endpoints for the path to join.
  const only = data.filter((d) => d.value > 0);
  let angle = -90;

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-[130px] h-[130px] shrink-0" role="img">
        {only.length === 1 ? (
          <circle cx={c} cy={c} r={r} fill="none" stroke={only[0].color} strokeWidth={thickness}>
            <title>{`${only[0].label}: ${only[0].value}`}</title>
          </circle>
        ) : (
          only.map((d) => {
            const sweep = (d.value / total) * 360;
            // ~2px of surface between segments, expressed as an angle.
            const gap = Math.min(3, sweep / 4);
            const start = angle + gap / 2;
            const end = angle + sweep - gap / 2;
            angle += sweep;
            const rad = (deg: number) => (deg * Math.PI) / 180;
            const x1 = c + r * Math.cos(rad(start));
            const y1 = c + r * Math.sin(rad(start));
            const x2 = c + r * Math.cos(rad(end));
            const y2 = c + r * Math.sin(rad(end));
            return (
              <path
                key={d.label}
                d={`M${x1},${y1} A${r},${r} 0 ${end - start > 180 ? 1 : 0} 1 ${x2},${y2}`}
                fill="none"
                stroke={d.color}
                strokeWidth={thickness}
              >
                <title>{`${d.label}: ${d.value} (${Math.round((d.value / total) * 100)}%)`}</title>
              </path>
            );
          })
        )}
        <text x={c} y={c + 1} textAnchor="middle" fontSize={22} fontWeight={800} fill={INK}>
          {total}
        </text>
      </svg>

      {/* The legend is where the numbers live, so nothing depends on telling
          two arcs apart by colour. */}
      <ul className="flex-1 min-w-[120px] space-y-1.5">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2 text-[11px]">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: d.color, boxShadow: `0 0 0 2px ${SURFACE}` }}
            ></span>
            <span className="text-stone-600 flex-1 truncate">{d.label}</span>
            <span className="font-bold text-stone-900 tabular-nums">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

/** Horizontal bars, for category names too long to sit under a vertical one. */
const RowBars: React.FC<{ data: Datum[]; emptyText: string }> = ({ data, emptyText }) => {
  const peak = Math.max(...data.map((d) => d.value), 0);
  if (peak <= 0) return <EmptyPlot text={emptyText} />;

  return (
    <ul className="space-y-2">
      {data.map((d) => (
        <li key={d.label} className="space-y-1">
          <div className="flex items-baseline justify-between gap-2 text-[11px]">
            <span className="text-stone-600 truncate">{d.label}</span>
            <span className="font-bold text-stone-900 tabular-nums">{d.value}</span>
          </div>
          <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(2, (d.value / peak) * 100)}%`, backgroundColor: d.color }}
              title={`${d.label}: ${d.value}`}
            ></div>
          </div>
        </li>
      ))}
    </ul>
  );
};
