# ViS-Go — #AIRiserVietnam 2026

**Track:** Cultural Tourism and Sports

| | |
|---|---|
| **Live demo (Cloud Run)** | `https://visgo-api-________.a.run.app` ← điền sau khi chạy `npm run deploy:api` |
| **Google AI Studio** | `________` ← **bắt buộc**, mở project AI Studio → Share → copy link |
| **Demo video (YouTube)** | `________` ← công khai, tối đa 2 phút |
| **LinkedIn** | `________` ← công khai, `#AIRiserVietnam #BuildwithGoogleAI` |

---

## Vấn đề

Khách quốc tế tới Việt Nam gặp hai bức tường cùng lúc: không tìm được người bản địa
đáng tin để dẫn đường, và không đọc được phần lớn nội dung du lịch vì nó chỉ có tiếng
Việt. Ở chiều ngược lại, người bản địa có kiến thức thật — biết con hẻm nào có quán phở
ngon, biết giờ nào chùa vắng — lại không có kênh nào để nhận khách, và phần lớn không đủ
tiếng Anh để tự viết một bài giới thiệu.

## Giải pháp

Nền tảng P2P nối khách du lịch với host bản địa đã khai danh tính, cộng ba thứ mà AI làm
tốt hơn con người ở đây:

1. **Trợ lý ViS-AI** — trả lời về tour, host, giá, lịch trình, **bằng đúng ngôn ngữ khách
   hỏi**, và bị buộc chỉ được nói những gì có thật trong catalogue.
2. **Trợ lý viết bài cho host** — một chatbot nhỏ ngay trong form đăng tour, giúp host
   viết hay hơn hoặc dịch sang thứ tiếng họ cần, nhưng **không được phép bịa ra sự thật**
   (giá, giờ, tên quán) mà chỉ host mới biết.
3. **Bộ lọc ngôn ngữ tour** — host khai tour này dẫn được bằng tiếng gì, khách lọc theo đó.

---

## Google technologies — những gì THỰC SỰ đang chạy

Bảng này chỉ liệt kê thứ đã được cấu hình và hoạt động. Phần chưa bật nằm ở mục dưới.

| # | Công nghệ | Dùng làm gì | Bằng chứng trong repo |
|---|---|---|---|
| 1 | **Google AI Studio** | Toàn bộ project được dựng trong AI Studio | `metadata.json` → `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API` |
| 2 | **Gemini API** | Trợ lý ViS-AI có RAG trên catalogue thật; trợ lý viết/dịch bài cho host; soạn lịch trình tour | `server/gemini.ts` (879+ dòng), `src/utils/ragEngine.ts` |
| 3 | **Firebase AI Logic** | Đường gọi Gemini không cần server — prompt template nằm trên console nên bộ luật không lộ trong bundle | `src/utils/firebaseAi.ts`, template `visgo-chat` + `visgo-translate` |
| 4 | **Firebase Authentication** | Đăng nhập khách / host / admin | `src/utils/firebaseAuth.ts` |
| 5 | **Cloud Firestore** | Tour, booking, hội thoại, đánh giá, hồ sơ định danh — kèm security rules 400+ dòng | `firestore.rules`, `src/utils/firestoreDb.ts` |
| 6 | **Firebase App Check** | reCAPTCHA v3 chặn người lạ gọi ké quota AI | `src/config/firebase.ts` |
| 7 | **Firebase Hosting** | Bản deploy song song | `firebase.json`, `.firebaserc` |
| 8 | **Google Cloud Run** | **Toàn bộ ứng dụng** (SPA + API) trong một container, scale-to-zero | `Dockerfile`, `scripts/deploy-cloudrun.sh` |

**Tám công nghệ, không phải mười một.** Ba thứ dưới đây có code hoàn chỉnh trong repo
nhưng **chưa bật**, và bài nộp không kể chúng vào:

| Công nghệ | Vì sao chưa bật | Ứng dụng chạy thế nào thay thế |
|---|---|---|
| Gmail API | Cần `VITE_GOOGLE_CLIENT_ID` (chưa tạo) | Mở cửa sổ soạn thư Gmail điền sẵn, khách bấm Gửi — `src/utils/googleGmail.ts` |
| Google Calendar API | Cùng lý do | Tải file `.ics`, mở được bằng mọi lịch — `src/utils/calendar.ts` |
| Google Maps JS API | Cần bật billing, mà dự án cố ý ở mức chi phí $0 | Leaflet + OpenStreetMap, cùng tính năng bản đồ — `src/components/RadarMap.tsx` |

Cả ba đều là **chuyển mạch một dòng env**: điền client ID hoặc bật `VITE_ALLOW_PAID_APIS`
là code có sẵn tự chạy. Chúng được viết để hỏng êm chứ không hỏng ồn.

---

## Ba điểm kỹ thuật đáng chú ý

### 1. AI bị kiểm toán trước khi khách nhìn thấy

Mỗi câu trả lời của model được đối chiếu ngược với catalogue nó được cho xem
(`ViSGoRagEngine.auditAnswer`). Nếu nó nhắc tới một tour, một host hoặc một mức giá không
tồn tại, câu trả lời bị **huỷ** và engine offline trả lời thay.

Một chatbot du lịch bịa ra tour là chuyện nhỏ trên màn hình và chuyện lớn ngoài đời: ai đó
sẽ đi tới một địa chỉ không có ai đợi.

### 2. Ba tầng dự phòng — chatbot không bao giờ chết

```
Firebase AI Logic  →  /api/rag-chat (Cloud Run)  →  engine RAG chạy trong trình duyệt
```

Mỗi tầng hỏng thì tầng sau đỡ. Tầng cuối không cần mạng, không cần khoá, không cần server.
Trợ lý không bao giờ trả về màn hình lỗi — nó chỉ bớt thông minh dần.

### 3. Trả lời đúng ngôn ngữ người hỏi, kể cả ngôn ngữ thứ ba

`src/utils/detectLanguage.ts` nhận diện theo hệ chữ (kana, hangul, hán tự, cyrillic, thai,
arabic) rồi tới dấu tiếng Việt. Khách hỏi bằng tiếng Nhật được trả lời bằng tiếng Nhật, dù
giao diện đang để tiếng Anh.

Chi tiết ít ai để ý nhưng quyết định: bộ lọc chủ đề của chatbot chấm điểm bằng **từ khoá
Việt và Anh**, nên một câu hỏi tiếng Nhật hoàn toàn hợp lệ từng bị nó gán nhầm là lạc đề và
từ chối. Giờ khi tin nhắn không phải vi/en, hệ thống **không tự phán xét** mà giao cho
Gemini — vốn đọc được thứ tiếng đó và có cùng bộ luật trong system prompt.

---

## Về chi phí và quyền riêng tư

- **Chốt chi tiêu tự viết trong server**: 12 lượt/IP/phút và 800 lượt/ngày
  (`server/gemini.ts`). Cloud Run chạy `--max-instances=1` nên bộ đếm trong RAM là con số
  thật, không phải con số nhân với số instance.
- **Cloud Run scale-to-zero**: không ai truy cập thì không container nào chạy.
- **Không lưu ảnh giấy tờ tuỳ thân.** Từ 01/01/2026, Nghị định 356/2025/NĐ-CP xếp ảnh chụp
  thẻ căn cước vào dữ liệu cá nhân nhạy cảm. Hệ thống chỉ lưu thông tin host tự khai và
  đưa cho quản trị viên xem, không lưu ảnh — huy hiệu xác minh vì thế được ghi rõ nghĩa là
  *"đã có người kiểm tra"*, không phải *"đã đối chiếu với cơ sở dữ liệu quốc gia"*.
- **Khoá không nằm trong bundle.** Kiểm chứng được:
  ```bash
  grep -r "AQ\.Ab" dist/          # rỗng — khoá Gemini
  grep -r "You are ViS-AI" dist/  # rỗng — bộ luật nằm trên server
  ```

---

## Chạy thử tại máy

```bash
npm install
cp .env.example .env     # điền GEMINI_API_KEY và các VITE_FIREBASE_*
npm run dev              # http://localhost:3000

npm run build && npm start   # bản production, SPA + API cùng một cổng
```
