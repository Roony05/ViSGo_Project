# Kiểm toán chi phí ViS-Go

Mục tiêu: **không dịch vụ nào trong dự án này có thể phát sinh phí.**

Tài liệu này liệt kê mọi dịch vụ bên ngoài mà code thật sự gọi tới, kèm cơ chế
đã cài để chặn chi phí. Kiểm chứng lại bất cứ lúc nào bằng:

```bash
grep -rhoE "https?://[a-zA-Z0-9._-]+" src/ server/ index.html | sort -u
```

---

## Bảng tổng hợp

| Dịch vụ | Dùng để | Cần thẻ? | Trạng thái |
|---|---|---|---|
| Gemini API | ViS-AI, Smart Translate | ❌ | ✅ Bật, có chặn tần suất |
| Firebase Auth | Đăng nhập thật | ❌ | ✅ Bật (gói Spark) |
| Firebase Firestore | Dữ liệu tour/booking/review | ❌ | ✅ Bật (gói Spark) |
| Firebase Cloud Storage | *(upload file)* | ✅ | 🚫 **Không dùng** |
| Firebase Cloud Functions | *(chạy code server)* | ✅ | 🚫 **Không dùng** |
| Google Maps JS API | Bản đồ GPS Radar | ✅ | 🔒 **Khoá sau 2 lớp** |
| Gmail API | Gửi email xác nhận | ❌ | ✅ Bật khi có OAuth |
| Calendar API | Tạo sự kiện lịch | ❌ | ✅ Bật khi có OAuth |
| OpenStreetMap / Leaflet | Bản đồ mặc định | ❌ | ✅ Bật |
| Unsplash | Ảnh mẫu | ❌ | ✅ Link trực tiếp, không cần tài khoản |
| DiceBear | Avatar mặc định | ❌ | ✅ API công khai, không cần key |
| Google Fonts | Font Be Vietnam Pro | ❌ | ✅ |
| cdnjs / unpkg | FontAwesome, Leaflet CSS | ❌ | ✅ |
| Firebase App Check | Chặn người lạ xài ké quota AI | ❌ | ✅ reCAPTCHA **v3**, không phải Enterprise |
| Firebase AI Logic | Gọi Gemini từ trình duyệt, không cần server | ❌ | ⏸️ Chưa bật (thiếu prompt template) |
| Mapillary | Ảnh 360° thật của địa danh | ❌ | ✅ Client token, chỉ đọc ảnh công khai |
| Playfair Display | Font chữ ký thương hiệu ở footer | ❌ | ✅ Google Fonts |
| Jitsi Meet (meet.jit.si) | Gọi thoại/video giữa khách và host | ❌ | ✅ Bật, không tài khoản, chặn ba lớp trần |

---

## Từng lớp bảo vệ

### 1. Firebase — ở lại gói Spark

Spark **không gắn thẻ nào cả**, nên về mặt kỹ thuật không thể bị trừ tiền. Chạm
trần quota thì Firebase báo lỗi và ngừng ghi, không bao giờ tính phí.

Hai dịch vụ Firebase bắt buộc lên Blaze (tức phải gắn thẻ) đã bị loại khỏi code:

- **Cloud Storage** — từ 03/02/2026 bắt buộc có billing account để tạo/giữ bucket
- **Cloud Functions** — luôn bắt buộc Blaze

`src/config/firebase.ts` chỉ import `firebase/app`, `firebase/auth`,
`firebase/firestore`, và **cố ý bỏ trống `storageBucket`** để không thể lỡ tay
tạo bucket. Thay thế:

- Ảnh → data URL trong document Firestore (có nén, xem mục 3)
- Việc lẽ ra chạy trên Cloud Functions → server Express `/api` của chính dự án

> ⚠️ Thứ **duy nhất** có thể làm bạn mất tiền với Firebase là tự tay bấm
> **"Upgrade to Blaze"** trong console. Blaze có quota miễn phí rộng hơn nhưng
> có thẻ thật phía sau, và "budget alert" của nó chỉ gửi email cảnh báo chứ
> **không tự dừng chi tiêu**.

**Cách tự kiểm tra:** Firebase Console → ⚙️ → Usage and billing → phải thấy
**Spark · No credit card required**.

### 2. Gemini — chặn tần suất phía server

Gói free của Gemini không cần thẻ và vượt quota chỉ trả về HTTP 429. Nhưng API
key thuộc về một project Google Cloud, và **nếu project đó từng bật billing thì
cùng key ấy tự động chuyển sang tier trả phí**. Nên `server/gemini.ts` đặt trần
cứng:

| Giới hạn | Giá trị |
|---|---|
| Mỗi IP mỗi phút | 12 request |
| Toàn server mỗi ngày | 800 request |

Vượt trần thì API trả `RATE_LIMITED` / `DAILY_CAP` và giao diện tự lùi về RAG
engine offline, kèm thông báo nói đúng lý do (không nói dối là "lỗi mạng").

Xem mức đã dùng:

```bash
curl http://localhost:3000/api/status
# {"gemini":true,...,"spendGuard":{"usedToday":12,"dailyCap":800,"perIpPerMinute":12}}
```

Muốn đổi trần thì sửa hằng `RATE_LIMIT` trong `server/gemini.ts`.

**Cách tự kiểm tra:** [Google Cloud Console → Billing](https://console.cloud.google.com/billing)
→ project chứa Gemini key phải ở trạng thái **không liên kết billing account**.

### 3. Ảnh — nén trước khi lưu

Không có Cloud Storage nên ảnh nằm trong document Firestore, mà Firestore chặn
cứng document ở **1 MiB** và base64 làm file phình thêm ~33%.

`src/utils/imageResize.ts` co ảnh về tối đa cạnh 640px, mã hoá JPEG và hạ chất
lượng dần cho tới khi dưới **380 KB**. Ảnh 5 MB từ điện thoại ra khoảng
60–120 KB. `firestore.rules` chặn lần hai ở tầng database.

#### Ảnh đại diện nằm riêng ở `avatars/{uid}`

Nén thôi chưa đủ. Vấn đề không phải chỗ chứa mà là **số lượt đọc** — hạn mức
hết trước tiên trên Spark (50.000 lượt/ngày, dùng chung cho mọi người vào app).

App đọc `profiles`, `tours`, `reviews` **nguyên cả collection**, và ảnh đại diện
còn được sao thêm vào từng tour, từng đánh giá, từng booking để thẻ khỏi phải
join. Nên một ảnh 35 KB để trong hồ sơ là:

- mọi khách vào trang đều tải, dù mặt đó không hiện trên màn hình;
- tải lại một lần nữa cùng danh mục tour, cho mỗi tour host đó đăng.

Giờ ảnh nằm một bản duy nhất ở `avatars/{uid}`, còn mọi chỗ khác chỉ giữ tham
chiếu `avatar:<uid>:<version>` — **44 byte thay cho 34.867 byte**. Số đo thật
sau khi tách:

| | Trước | Sau |
|---|---|---|
| Hồ sơ có ảnh tự tải lên | 35.121 B | **298 B** |
| Cả collection `profiles` (5 hồ sơ) | ~38 KB | **3.930 B** |

`src/utils/avatarStore.ts` tải ảnh khi thật sự cần và lưu lại trong
localStorage: mỗi host tốn **1 lượt đọc cho một thiết bị**, những lần sau bằng
0. `boundedRef()` trong `firestore.rules` chặn ảnh quay lại các collection đó.
Chuyển dữ liệu cũ bằng `npm run split:avatars`, kiểm bằng `npm run test:avatars`.

### 4. Google Maps — khoá hai lớp

Đây là tích hợp **duy nhất** bắt buộc gắn thẻ. Google bỏ khoản credit
200$/tháng từ 01/03/2025; hiện vẫn có 10.000 map loads/tháng miễn phí nhưng
**phải có billing account mới cấp được key**.

Nên chỉ dán key thôi là chưa đủ. `src/config/env.ts` yêu cầu **cả hai**:

```env
VITE_GOOGLE_MAPS_API_KEY=AIza...
VITE_ALLOW_PAID_APIS=true      # phải bật thủ công
```

Thiếu cờ thứ hai thì key bị bỏ qua, bản đồ chạy Leaflet + OpenStreetMap (miễn
phí, không cần key), và console in cảnh báo để bạn biết key đang bị giữ lại chứ
không phải hỏng.

Các nút "Chỉ đường Google Maps" **vẫn hoạt động** vì link Google Maps thường
không cần API key.

### 5. Gmail + Calendar — miễn phí thật

Dùng Google Identity Services chạy thẳng ở trình duyệt, không cần backend,
không cần client secret. Gmail API và Calendar API có quota miễn phí rộng và
**không liên quan billing**. Không có key thì app mở sẵn cửa sổ soạn thư / link
lưu lịch để bạn tự bấm — vẫn dùng được, chỉ thêm một cú click.

### 6. Gọi trong app — miễn phí ngay từ gốc

Cuộc gọi chạy trên **Jitsi Meet công cộng** (`meet.jit.si`). Không tài khoản,
không API key, không thẻ — nên **không tồn tại quan hệ thanh toán nào** để phát
sinh phí. Đây là lớp bảo vệ thật sự; ba cái trần bên dưới là để phòng trường hợp
sau này ai đó trỏ `VITE_CALL_DOMAIN` sang một dịch vụ có tính tiền.

| Trần | Mặc định | Ai kiểm |
|---|---|---|
| Phút gọi mỗi tháng | 10.000 | `src/utils/callBudget.ts`, kiểm **trước** khi mở phòng |
| Phút mỗi cuộc | 30 | Đồng hồ đếm ngược trong `CallModal`, tự cúp máy |
| Cuộc mỗi ngày | 20 | `callBudget.ts` |

Chạm trần thì **nút gọi tắt hẳn** kèm lời giải thích, không có đường nào đi tiếp
sang phần tính phí.

**Không lưu dữ liệu cuộc gọi.** Không ghi âm, không nhật ký, không bản ghi ai gọi
ai lúc nào. Thứ duy nhất được ghi là ba con số đếm trong `localStorage` của chính
trình duyệt đó, và chúng chỉ để chặn cuộc gọi tiếp theo khi hết hạn mức. Tên
phòng là SHA-256 của `(VITE_CALL_ROOM_SALT + mã booking)` — không lưu ở đâu cả,
hai bên tự tính lại — vì trên máy chủ công cộng thì tên phòng chính là ổ khoá.

---

## Hạn mức miễn phí và khi nào chạm tới

Gói Spark (xem [firebase.google.com/pricing](https://firebase.google.com/pricing)):

| Loại | Miễn phí | Chạm tới khi nào |
|---|---|---|
| Dữ liệu lưu | 1 GiB | ~8.900 ảnh đã nén |
| **Băng thông ra / tháng** | **10 GiB** | **~235 lượt xem trang/ngày** ← hết trước tiên |
| Đọc / ngày | 50.000 | ~500 lượt tải danh mục |
| Ghi / ngày | 20.000 | Rất khó chạm |
| Người dùng / tháng | 50.000 | Rất khó chạm |

Băng thông cạn trước dung lượng khoảng 40 lần, vì không có Cloud Storage nghĩa
là không có CDN — mỗi lượt xem là một lần tải lại bytes ảnh từ Firestore.

Hiện tại 45 ảnh mẫu đều là link Unsplash nên **Unsplash trả băng thông, không
phải Firebase**. Phép tính trên chỉ bắt đầu tính từ khi người dùng thật upload ảnh.

Chạm trần trên Spark thì app **báo lỗi và ngừng ghi**, không âm thầm trừ tiền.
Hạn mức reset mỗi ngày (đọc/ghi) và mỗi tháng (băng thông).

---

## Nếu sau này cần vượt hạn mức

Không phải viết lại app, chỉ đổi chỗ chứa ảnh:

1. Gắn thẻ → bật Cloud Storage (5 GB lưu + 100 GB băng thông/tháng vẫn miễn phí,
   có CDN thật)
2. Không gắn thẻ → đẩy ảnh lên dịch vụ ngoài như Cloudinary (25 GB/tháng miễn
   phí), Firestore chỉ lưu URL — đúng cách 45 ảnh Unsplash đang chạy

---

## Kiểm toán lại ngày 25/08/2026

Chạy lại toàn bộ, đây là ảnh chụp tình trạng thật của repo lúc này.

### Mọi domain mà code gọi tới

Đếm bằng `grep -rhoE "https?://[^"']+" src/ server/ netlify/ scripts/ seed/ index.html`:

| Domain | Cần thẻ? |
|---|---|
| `images.unsplash.com` (63 lần) | ❌ link ảnh trực tiếp, không key |
| `graph.mapillary.com` | ❌ client token |
| `fonts.googleapis.com`, `fonts.gstatic.com` | ❌ |
| `cdnjs.cloudflare.com`, `unpkg.com` | ❌ |
| `api.dicebear.com` | ❌ không cần key |
| `accounts.google.com`, `gmail.googleapis.com`, `calendar.google.com` | ❌ OAuth, quota miễn phí |
| `www.google.com/recaptcha` | ❌ v3 classic |
| `maps.googleapis.com` | ⚠️ **cần thẻ — và đang bị khoá, xem dưới** |

### Ba lớp khoá Google Maps vẫn còn nguyên

Đây là tích hợp **duy nhất** trong dự án có thể tính tiền, và nó bị chặn ba lần:

1. `VITE_GOOGLE_MAPS_API_KEY` để trống trong `.env`
2. `VITE_ALLOW_PAID_APIS=false`
3. `vite.config.ts:71` **xoá trắng key ngay lúc build** khi cờ trên không phải
   `true` — nên kể cả có dán key vào cũng không lọt được vào bundle

Bản đồ đang chạy bằng Leaflet + OpenStreetMap, không key, không thẻ, đủ tính năng.

### Firebase vẫn nằm trong vòng Spark

`grep -r "firebase/"` trong `src/` chỉ ra bốn module: `app`, `auth`, `firestore`,
và `app-check` (nạp động). **Không có** `firebase/storage`, **không có**
`firebase/functions` — hai thứ duy nhất bắt buộc lên Blaze.

### Chốt chi Gemini vẫn hoạt động

`server/gemini.ts` giới hạn 12 request/IP/phút và 800 request/ngày cho cả server.
Vượt trần thì trả `RATE_LIMITED` / `DAILY_CAP` và giao diện tự lùi về engine
offline. Xem mức đã dùng: `curl http://localhost:3000/api/status`.

### Hai thứ cần bạn tự xác nhận trên console

Code không kiểm tra hộ được, vì đây là trạng thái tài khoản chứ không phải mã nguồn:

1. **Project chứa `GEMINI_API_KEY` phải KHÔNG liên kết billing account.**
   Key AI Studio thuộc về một project Google Cloud; nếu project đó từng bật
   billing thì **cùng một key ấy tự động chuyển sang tier trả phí**, và chốt chi
   trong `server/gemini.ts` chỉ giới hạn số lượt gọi chứ không đổi được tier.
   Kiểm tra: [Cloud Console → Billing](https://console.cloud.google.com/billing).

2. **Firebase phải còn ở Spark.**
   Kiểm tra: Firebase Console → ⚙️ → Usage and billing → phải thấy
   **Spark · No credit card required**.

### Thứ duy nhất có thể làm bạn mất tiền

Không phải một dòng code nào cả. Là ba cái nút:

- **"Upgrade to Blaze"** trong Firebase Console
- **"Enable billing"** trong Cloud Console cho project chứa Gemini key
- Chọn **reCAPTCHA Enterprise** thay vì **v3 classic** khi cấu hình App Check

Không bấm ba cái đó thì không có đường nào phát sinh phí.

---

## Kiểm toán hạn mức đầy đủ — 25/08/2026

Phần trên trả lời "cái gì có thể tính tiền". Phần này trả lời câu còn lại:
**dùng tới mức nào thì hết miễn phí, và lúc đó chuyện gì xảy ra.**

### Nguyên tắc chi phối tất cả

Một project Google Cloud / Firebase **không gắn billing account thì không có
đường nào trừ tiền**. Không phải "Google tử tế", mà là không tồn tại tài khoản
để ghi nợ. Vượt hạn mức thì API trả `429` / `RESOURCE_EXHAUSTED`, dịch vụ ngừng
phục vụ tới kỳ reset. Đây là lý do mọi hạn mức dưới đây đều là **cầu dao, không
phải hoá đơn** — với đúng một điều kiện: không bấm nút gắn thẻ.

### Bảng hạn mức — thứ tự từ chặt nhất tới lỏng nhất

| Dịch vụ | Hạn mức miễn phí | Quy ra lưu lượng thật | Chạm trần thì sao |
|---|---|---|---|
| **reCAPTCHA v3 (qua App Check)** | **10.000 assessment/tháng** | **~220 lượt truy cập/ngày** | 429 → App Check hết token → **chatbot rớt offline** |
| Firebase Hosting — băng thông | 360 MB/ngày | ~450 lượt tải trang nguội/ngày | Ngừng phục vụ file tới nửa đêm PT |
| Gemini (free tier) | ~15 req/phút · ~1.000 req/ngày mỗi model | ~1.000 câu hỏi/ngày | 429 → tự lùi về engine offline |
| Firestore — đọc | 50.000 doc/ngày | ~500 lượt mở danh mục | Ngừng đọc, app dùng cache |
| Firestore — ghi | 20.000 doc/ngày | Rất khó chạm | Ngừng ghi |
| Firestore — băng thông | 10 GiB/tháng | ~235 lượt xem/ngày *(chỉ tính khi có ảnh upload thật)* | Ngừng phục vụ |
| Firestore — dung lượng | 1 GiB | ~8.900 ảnh đã nén | Ngừng ghi |
| Firebase Auth | 50.000 MAU/tháng | 50.000 người thật/tháng | Ngừng cấp phiên đăng nhập |
| Firebase Hosting — dung lượng | 10 GB | Bundle đang ~3 MB | — |
| Gmail API | 80.000.000 quota unit/ngày (send = 100) | ~800.000 email/ngày | Ngoài tầm với |
| Calendar API | ~1.000.000 query/ngày | Ngoài tầm với | — |
| Google Fonts | Không có hạn mức, không cần key | — | — |
| Mapillary | Client token đọc ảnh công khai | — | — |

Hạn mức **theo ngày của Firestore reset lúc nửa đêm giờ Thái Bình Dương**, tức
khoảng **14:00–15:00 giờ Việt Nam** — không phải nửa đêm giờ mình.

### ⚠️ Thay đổi mới: reCAPTCHA đã cắt free tier 100 lần

**Ngày 02/04/2026 Google hạ free tier của reCAPTCHA từ 1.000.000 xuống 10.000
assessment mỗi tháng.** Phần kiểm toán viết trước đó của tài liệu này ngầm định
con số cũ, nên đã lỗi thời.

Vì sao nó đụng thẳng vào ViS-Go: App Check **tự tạo một assessment mỗi lần
làm mới App Check token**, và token đó có TTL khoảng một giờ. Nghĩa là hạn mức
này tiêu theo **lượt truy cập**, không phải theo số câu hỏi gửi cho chatbot.

    10.000 / 30 ngày ≈ 333 assessment/ngày ≈ 220 lượt truy cập/ngày

Đây hiện là **trần chặt nhất trong toàn bộ dự án** — chặt hơn Firestore khoảng
150 lần. Và 10.000 ấy tính **cho cả organization**, cộng dồn mọi site dùng chung
tài khoản Google, chứ không phải mỗi key một suất.

Vượt trần, hai kịch bản tách hẳn nhau:

| Project có billing account | Kết quả |
|---|---|
| **Không** (tình trạng hiện tại) | 429 → App Check không cấp token → AI Logic trả 401 → chatbot lùi về offline. **Không mất tiền.** |
| **Có** | $8/tháng tới 100.000 assessment, rồi $1 mỗi 1.000. **Tự động trừ.** |

Nói cách khác: với tài khoản free, cái giá của việc vượt trần reCAPTCHA là
*chatbot im tiếng*, đúng bằng cái giá của việc App Check chưa cấu hình xong —
cùng một triệu chứng, hai nguyên nhân khác nhau.

Cách nới nếu sau này thật sự chạm trần mà vẫn không muốn gắn thẻ: **tắt enforce
App Check cho Firebase AI Logic**. Mất lớp chặn người lạ gọi ké, nhưng quota
Gemini vốn cũng là cầu dao chứ không phải hoá đơn, nên rủi ro là gián đoạn dịch
vụ chứ không phải tiền.

### Ba nút — và chỉ ba nút — mở đường cho hoá đơn

1. **"Upgrade to Blaze"** trong Firebase Console
2. **"Enable billing"** trong Cloud Console, cho project đang giữ `GEMINI_API_KEY`
   *(cùng một key đó lập tức chuyển sang tier trả phí, chốt chi trong
   `server/gemini.ts` chỉ giới hạn số lượt gọi chứ không đổi được tier)*
3. **Gắn thẻ để lấy Google Maps API key** — Maps không cấp key nào cho tài khoản
   chưa có billing, nên bản thân việc xin key đã là bước gắn thẻ

Riêng reCAPTCHA thì khác ba cái trên ở một điểm đáng lưu ý: nó **không có nút
riêng**. Nếu project đã gắn billing vì lý do khác, phần vượt 10.000 assessment
sẽ tự tính tiền mà không hỏi lại lần nào.

---

## Hết quota rồi thì tháng sau thế nào — và dữ liệu cũ có mất không

Bảng ở trên gộp chung mọi hạn mức, nhưng chúng khác nhau về bản chất. Một loại
đếm **số lần làm việc trong một khoảng thời gian**, loại kia đo **lượng đang
chiếm chỗ**. Chỉ loại đầu mới reset.

### Loại 1 — đếm theo dòng chảy. Reset đầy lại.

| Hạn mức | Chu kỳ |
|---|---|
| reCAPTCHA 10.000 assessment | Mùng 1 hàng tháng |
| Firestore đọc / ghi / xoá | Nửa đêm giờ Thái Bình Dương (~14–15h VN) |
| Firestore băng thông ra 10 GiB | Hàng tháng |
| Hosting băng thông 360 MB | Hàng ngày |
| Gemini req/phút · req/ngày | Mỗi phút · mỗi ngày |
| Gmail · Calendar quota unit | Hàng ngày |

Hai điều cần nhớ:

- **Không cộng dồn.** Tháng này xài ít không làm tháng sau được nhiều hơn.
- **Không phạt.** Xài cạn sạch tháng này thì mùng 1 vẫn đầy lại nguyên vẹn
  10.000, y hệt tháng chưa đụng tới.

### Loại 2 — đo theo tồn kho. Không bao giờ reset.

| Hạn mức | Ghi chú |
|---|---|
| Firestore 1 GiB dữ liệu lưu | Chỉ giảm khi bạn xoá document |
| Hosting 10 GB file đã deploy | Chỉ giảm khi xoá release cũ |

Đầy 1 GiB thì **tháng sau vẫn đầy 1 GiB**. Đây không phải cái đợi được.

### Dữ liệu cũ không mất

Chạm trần, Firestore trả `RESOURCE_EXHAUSTED` và **chặn thao tác** — nó không
đụng vào dữ liệu đã lưu.

| Tình huống | Hậu quả |
|---|---|
| Hết quota đọc | Hôm nay không đọc thêm được; dữ liệu còn nguyên, qua mốc reset đọc lại bình thường |
| Hết quota ghi | Không ghi thêm được; những gì đã ghi vẫn ở đó |
| Đầy 1 GiB | Không ghi thêm được cho tới khi tự dọn chỗ. Không có gì bị đẩy ra để nhường chỗ |

Google **không xoá dữ liệu vì bạn vượt hạn mức**. Chỉ có ba đường làm mất dữ
liệu, cả ba đều do bạn chủ động: xoá tay, xoá project, hoặc đặt TTL policy cho
collection.

Về chuyện project để lâu không dùng: không tìm thấy chính sách công bố nào nói
Google tự xoá dữ liệu Firestore của project Spark vì không hoạt động. Không
khẳng định chắc chắn là không có — chỉ là không có tài liệu nào nói vậy.

### Một chỗ tự phình: Hosting giữ lại mọi bản deploy cũ

Mỗi lần `npm run deploy`, Firebase giữ bản cũ lại làm một *release*, và các bản
cũ **cộng dồn vào 10 GB**. Đây là loại 2 — chỉ đi lên, không tự về. Đầy thì
**không deploy được nữa**; site đang chạy vẫn chạy, chỉ là không đẩy bản mới lên.

    dist hiện tại   3,1 MB  (19 file)
    10 GB ÷ 3,1 MB  ≈  3.200 lần deploy

Còn rất xa. Muốn chắc, đặt số bản giữ lại ở **Firebase Console → Hosting → ⋮
trên site → Release storage settings**, Firebase sẽ tự dọn phần dư.

---

## Cloud Run — Blaze có thể gần $0, nhưng không bảo đảm $0 tuyệt đối

Cloud Run không dùng được trên Spark: liên kết Cloud Billing sẽ nâng project
sang Blaze. Với API nhỏ, request-based billing, `min-instances=0` và traffic
thấp, mức dùng dự kiến nằm trong free tier. Tuy nhiên free tier là hạn mức, không
phải cơ chế từ chối request khi hết hạn mức; phần vượt sẽ được tính tiền.

Chi tiết từng hạng mục có thể tính phí, phép tính theo traffic, checklist trước
deploy và quy trình xoá sạch được duy trì tại
[`CLOUDRUN_ZERO_COST.md`](CLOUDRUN_ZERO_COST.md), tránh để hai bảng số liệu lệch
nhau khi Google thay đổi giá.

Năm lớp giảm rủi ro đã cấu hình/chuẩn bị:

1. Cloud Run scale-to-zero và request-based billing.
2. `max-instances=1`, concurrency 80, timeout 30 giây và rate limit Gemini.
3. Artifact Registry cleanup giữ ba image mới nhất.
4. Budget alert thấp qua email và Pub/Sub.
5. Kill switch gỡ billing khi nhận thông báo vượt budget.

Budget alert không chặn chi tiêu. Google nêu rõ dữ liệu billing và thông báo có
độ trễ, nên kill switch có thể chạy sau khi đã phát sinh thêm chi phí. Gỡ billing
cũng dừng toàn bộ dịch vụ trong project, kể cả dịch vụ đang dùng free tier, và
có rủi ro tài nguyên không phục hồi đầy đủ. Vì vậy:

- Muốn **không thể có hoá đơn**: giữ Spark + Firebase Hosting/Firebase AI Logic;
  backend `/api` không chạy trên production, chatbot vẫn chạy qua Firebase AI
  Logic hoặc offline fallback.
- Muốn **backend `/api` ổn định, secret ở server, Docker, autoscaling và log tập
  trung**: dùng Cloud Run, chấp nhận billing account và rủi ro vượt free tier dù
  đã có các lớp giảm thiểu.
