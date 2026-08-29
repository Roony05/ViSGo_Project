# ViS-Go 🇻🇳

Nền tảng P2P kết nối du khách quốc tế với người bạn bản địa đã xác minh (verified local buddy) và các trải nghiệm văn hoá chân thực tại Việt Nam.

React 19 · TypeScript · Vite 6 · Tailwind CSS 4 · Leaflet · jsPDF · Gemini AI

---

## Chạy nhanh

```bash
npm install
cp .env.example .env      # rồi điền key (xem bên dưới)
npm run dev               # http://localhost:3000
```

App **chạy được ngay mà không cần bất kỳ API key nào**. Mọi tích hợp Google đều
có đường lui miễn phí. Điền key chỉ để nâng cấp trải nghiệm.

| Lệnh | Việc |
|---|---|
| `npm run dev` | Dev server + hot reload + API AI |
| `npm run build` | Typecheck rồi build production vào `dist/` |
| `npm run preview` | Xem thử bản build (có kèm API AI) |
| `npm start` | Chạy server production Express (`dist/` + API AI) |
| `npm run serve` | `build` rồi `start` |
| `npm run lint` | Chỉ typecheck |

---

## Tài khoản demo

Bấm nút **1-Click Demo Login** trên màn hình đăng nhập, hoặc nhập tay:

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Khách du lịch | `customer@visgo.vn` | `pass123` |
| Host bản địa | `host@visgo.vn` | `pass123` |
| Host bản địa 2 | `linh.host@visgo.vn` | `pass123` |
| Quản trị viên | `admin@visgo.vn` | `admin123` |

---

## Cấu hình API key

Cả ba mục dưới đây đều **tuỳ chọn**. Cột "Cần thẻ?" là điều cần lưu ý nhất.

| Tích hợp | Biến môi trường | Chi phí | Cần thẻ tín dụng? | Nếu bỏ trống |
|---|---|---|---|---|
| Gemini AI | `GEMINI_API_KEY` | Miễn phí (free tier) | ❌ Không | Dùng RAG engine offline |
| Gmail + Calendar | `VITE_GOOGLE_CLIENT_ID` | Miễn phí | ❌ Không | Mở link soạn sẵn, tự bấm Gửi/Lưu |
| Google Maps | `VITE_GOOGLE_MAPS_API_KEY` | 10.000 loads/tháng free | ✅ **Có** | Dùng Leaflet + OpenStreetMap |
| Firebase | `VITE_FIREBASE_*` (4 biến) | Miễn phí (gói Spark) | ❌ Không | Lưu dữ liệu trên `localStorage` |

### 1. Gemini AI — miễn phí, không cần thẻ

Dùng cho trợ lý **ViS-AI** và nút **Smart Translate** của Host.

1. Vào <https://aistudio.google.com/apikey>
2. Đăng nhập Google → **Create API key** → **Create API key in new project**
3. Copy key (dạng `AIza...`) và dán vào `.env`:

```env
GEMINI_API_KEY=AIzaSy...
```

Key này **chỉ nằm ở server** (Vite dev server hoặc `server/index.ts`), không bao
giờ bị đóng gói vào bundle trình duyệt.

App tự dò model khả dụng theo thứ tự `gemini-flash-latest` →
`gemini-2.5-flash` → `gemini-2.0-flash` → `gemini-2.5-flash-lite`, nên không
hỏng khi Google đổi tên model. Muốn ghim một model cụ thể thì đặt `GEMINI_MODEL`.

Kiểm tra đã nhận key chưa:

```bash
curl http://localhost:3000/api/status
# {"gemini":true,"model":"gemini-flash-latest"}
```

### 2. Gmail + Google Calendar — miễn phí, không cần thẻ

Bật gửi email xác nhận **thật** và tạo sự kiện lịch **thật**.

1. <https://console.cloud.google.com/> → tạo project mới
2. **APIs & Services → Library** → bật **Gmail API** và **Google Calendar API**
3. **APIs & Services → OAuth consent screen**
   - User type: **External**
   - Thêm chính email của bạn vào **Test users**
   - Scopes: `.../auth/gmail.send` và `.../auth/calendar.events`
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Authorized JavaScript origins:
     ```
     http://localhost:3000
     http://localhost:4173
     ```
     (thêm domain production khi deploy)
5. Copy **Client ID** vào `.env`:

```env
VITE_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
```

Client ID là thông tin công khai theo thiết kế của Google — an toàn khi để ở
client. **Không bao giờ** đặt Client Secret vào biến có tiền tố `VITE_`.

App dùng Google Identity Services chạy thẳng ở trình duyệt, xin quyền theo từng
tính năng: chỉ hỏi quyền Gmail khi bạn bấm gửi email, chỉ hỏi quyền Calendar khi
bạn bấm thêm vào lịch.

> Khi consent screen còn ở chế độ **Testing**, chỉ các email trong danh sách
> Test users mới đăng nhập được. Muốn mở cho mọi người thì submit để Google
> xét duyệt.

### 3. Google Maps — ⚠️ bắt buộc gắn thẻ

Google đã **bỏ khoản credit 200$/tháng từ 01/03/2025**. Hiện Maps JavaScript API
cho 10.000 map loads/tháng miễn phí, nhưng **vẫn bắt buộc tạo billing account có
thẻ thật** mới cấp được API key.

**Không muốn gắn thẻ thì cứ để trống biến này.** GPS Radar sẽ tự động chạy bằng
Leaflet + OpenStreetMap — miễn phí, không cần key, đầy đủ marker/lộ trình/GPS y
hệt. Các nút "Chỉ đường Google Maps" vẫn hoạt động bình thường vì link Google
Maps không cần API key.

Nếu vẫn muốn bật:

1. Bật **Maps JavaScript API** trong Cloud Console
2. Tạo API key, **giới hạn theo HTTP referrer** cho domain của bạn
3. Dán vào `.env`:

```env
VITE_GOOGLE_MAPS_API_KEY=AIza...
```

Không phải sửa dòng code nào — app tự phát hiện và đổi backend bản đồ.

### 4. Firebase — miễn phí, không cần thẻ (gói Spark)

Bật **đăng nhập thật** và **lưu dữ liệu lên cloud** thay cho `localStorage`,
đồng bộ được giữa nhiều máy và nhiều người dùng.

#### Vì sao chắc chắn không mất tiền

Gói **Spark không gắn thẻ nào cả**, nên về mặt kỹ thuật nó *không thể* trừ tiền.
Chạm trần quota thì Firebase trả về lỗi, không bao giờ tính phí.

> ⚠️ Điều duy nhất làm bạn mất tiền là tự tay bấm **"Upgrade to Blaze"**.
> Đừng bấm. Blaze có quota miễn phí rộng hơn nhưng **có thẻ thật phía sau**, và
> "budget alert" của nó chỉ gửi email cảnh báo chứ **không tự dừng chi tiêu**.

Hạn mức Spark: **50.000 lượt đọc + 20.000 lượt ghi mỗi ngày**, 1 GiB dữ liệu,
50.000 người dùng hoạt động mỗi tháng. Với một đồ án thì rất khó chạm tới.

App **cố tình không dùng** hai thứ bắt buộc phải lên Blaze:

| Dịch vụ | Vì sao tránh | Dùng gì thay |
|---|---|---|
| Cloud Storage | Từ 03/02/2026 bắt buộc có billing account | Ảnh lưu dạng URL / data URL trong Firestore |
| Cloud Functions | Luôn bắt buộc Blaze | Server Express + `/api` sẵn có của dự án |

Code đã chốt điều này: `src/config/firebase.ts` chỉ import `firebase/app`,
`firebase/auth`, `firebase/firestore`, và **cố ý bỏ trống `storageBucket`** để
không thể lỡ tay tạo bucket.

#### Các bước

1. <https://console.firebase.google.com/> → **Add project** (tắt Google Analytics
   cho gọn)
2. Bấm biểu tượng **`</>`** (Web) để tạo Web App → copy đoạn `firebaseConfig`
3. **Build → Authentication → Get started** → bật **Email/Password** và **Google**
4. **Build → Firestore Database → Create database** → chọn **Start in production
   mode** → chọn region `asia-southeast1` (Singapore, gần Việt Nam nhất)
5. Sang tab **Rules**, dán toàn bộ nội dung file **`firestore.rules`** ở thư mục
   gốc dự án → **Publish**
6. Điền 4 giá trị vào `.env`:

```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=ten-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=ten-project
VITE_FIREBASE_APP_ID=1:123...:web:abc...
```

Phải điền **đủ cả 4**; thiếu một cái là app tự quay về `localStorage`.

`VITE_FIREBASE_API_KEY` **không phải mật khẩu** — Firebase thiết kế để lộ nó ra
trình duyệt. Thứ thật sự bảo vệ dữ liệu là **Firestore Rules** ở bước 5, nên
đừng bỏ qua bước đó.

#### Chạy lần đầu

Lần chạy đầu tiên app tự đẩy danh mục tour mẫu lên Firestore và báo toast
"Đã kết nối Firebase". Sau đó:

- Đăng ký / đăng nhập bằng email hoặc nút **Google** đều là thật
- Tour, booking, review, hồ sơ eKYC lưu lên Firestore, mở máy khác vẫn còn
- Góc dưới trái hiện badge khi đang đồng bộ hoặc khi **lưu thất bại** — app
  không bao giờ giả vờ đã lưu xong

Các tài khoản demo (`customer@visgo.vn`…) **không có** trên Firebase Auth. App
thử Firebase trước, thất bại thì tự lùi về danh sách demo trong máy, nên nút
1-Click Demo vẫn dùng được bình thường.

---

## Di sản VR 360°

Tab **Di sản VR 360°** cho phép đứng giữa 8 địa danh trước khi đặt tour:

Vịnh Hạ Long · Phố cổ Hội An · Kinh thành Huế · Ruộng bậc thang Sa Pa ·
Hang động Phong Nha · Thánh địa Mỹ Sơn · Hồ Hoàn Kiếm · Đồng bằng sông Cửu Long

| Thiết bị | Cách xem |
|---|---|
| Máy tính | Kéo chuột để nhìn quanh, cuộn để phóng to |
| Điện thoại | Kéo, hoặc bật **Xoay theo điện thoại** để nghiêng máy mà nhìn |
| Kính VR | Nút **Vào kính VR** hiện ra khi trình duyệt hỗ trợ WebXR |

**Ảnh 360° ở đâu ra?** Toàn bộ là **ảnh chụp thật**, lấy từ
[Mapillary](https://www.mapillary.com/) (CC BY-SA, miễn phí, không cần thẻ).
Đây là nguồn duy nhất còn lại sau khi đã đối chiếu thực tế: Wikimedia Commons
không có một ảnh equirectangular nào của Việt Nam, còn phần Việt Nam trên
Panoramax chỉ là ảnh phẳng chụp bằng điện thoại.

Mỗi địa danh trong `src/data/vrLandmarks.ts` ghim một **`mapillaryId`** đã được
tải về và **xem tận mắt** trước khi đưa vào. Bước này bắt buộc: ảnh 360° gần
một di tích nhất thường là một con đường cách đó vài trăm mét, trong khung hình
không có di tích nào cả — ghim theo khoảng cách sẽ ra một gallery toàn phố xá vô
danh gắn nhãn di sản.

Vì vậy danh sách chỉ có những nơi thật sự có ảnh. Mapillary phủ dày Hà Nội,
TP.HCM, Đà Nẵng, Hội An, Đà Lạt và Hạ Long; **không** có ở Huế, Mỹ Sơn, Phong
Nha, Sa Pa, Ninh Bình và ngoài vịnh Hạ Long. Những nơi đó không được liệt kê,
thay vì hứa cho xem một chỗ mà mình không có ảnh.

Ghim **id** chứ không ghim URL: Mapillary phát ảnh qua CDN với tham số `oe=`
hết hạn sau vài ngày, nên URL nhúng sẵn sẽ chết. `GET /api/panorama?ids=a,b,c`
phân giải cả gallery trong đúng một request; token nằm lại ở server.

Muốn thêm một địa danh: tìm id ảnh trên mapillary.com, **mở ảnh ra xem trước**,
rồi thêm một mục vào `VR_LANDMARKS` với `mapillaryId` đó. Nếu id không phân giải
được, viewer tự tìm ảnh 360° gần toạ độ nhất và ghi rõ khoảng cách trên nhãn —
không bao giờ vẽ thay.

Three.js chỉ tải khi bạn thật sự mở một tour VR (`React.lazy`), nên người không
dùng VR không phải tải thêm gì.

---

## Kiến trúc

```
firestore.rules    Rules bảo mật Firestore — dán vào Firebase Console
server/
  gemini.ts        Logic Gemini dùng chung (RAG chat + Smart Translate)
  index.ts         Server Express production (dist/ + /api)
src/
  config/env.ts      Bật/tắt tính năng Google theo key có sẵn
  config/firebase.ts Khởi tạo Firebase, chốt cứng phạm vi gói Spark
  utils/
    googleAuth.ts  OAuth qua Google Identity Services (không cần secret)
    googleGmail.ts Gửi Gmail thật, fallback sang compose/mailto
    calendar.ts    Tạo event Calendar thật, fallback sang link TEMPLATE
    googleMaps.ts  Loader Maps JS API + các link Google Maps không cần key
    aiClient.ts     Client gọi /api/*
    ragEngine.ts    RAG engine offline (chạy khi không có Gemini key)
    firebaseAuth.ts Đăng nhập Email/Google, có đường lui về tài khoản local
    firestoreDb.ts  Đọc/ghi Firestore, có cache để tiết kiệm quota
    cloudSync.ts    Cầu nối localStorage <-> Firestore
  data/
    vrLandmarks.ts  17 địa danh VR, mỗi nơi ghim 1 ảnh 360° thật đã kiểm
  components/
    RadarMap.tsx      Bản đồ 2 backend: Google Maps hoặc Leaflet
    VRHeritageView.tsx Gallery di sản VR
    VRTourViewer.tsx   Viewer 360° (three.js + WebXR), lazy-load
```

**Nguyên tắc xuyên suốt:** không tính năng nào được phép chết vì thiếu key. Mỗi
tích hợp đều có đường lui miễn phí, và giao diện luôn nói thật đường nào đang
chạy — không giả vờ đã gửi email khi chưa gửi.

`/api` được mount giống hệt nhau ở dev server, preview server và Express, nên
tính năng AI hoạt động ở cả ba, không chỉ lúc `npm run dev`.

---

## Ghi chú

- **GPS** cần **HTTPS hoặc localhost**. Mở qua `http://` với IP LAN sẽ bị trình
  duyệt chặn định vị — app sẽ báo rõ lý do thay vì im lặng.
- Toàn bộ dữ liệu (user, tour, booking, review, KYC) lưu ở `localStorage`.
  Xoá bằng DevTools → Application → Local Storage.
- Thanh toán VNPay/MoMo/Card là mô phỏng, không có giao dịch thật.
- Nút SOS là mô phỏng giao thức an toàn, **không** gọi 113 thật.
- Đăng nhập **Apple / Facebook** hiển thị mờ vì chưa nối provider nào. Trước đây
  hai nút này lặng lẽ đăng nhập thành tài khoản demo, gây hiểu nhầm.
- Chế độ kính VR cần trình duyệt hỗ trợ **WebXR**; máy không hỗ trợ thì nút
  "Vào kính VR" tự ẩn, vẫn kéo/nghiêng để xem 360° bình thường.
