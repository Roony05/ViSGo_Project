# Bài đăng LinkedIn / Community — ViS-Go

> **Cách dùng:** copy toàn bộ phần trong khung dưới, dán thẳng vào LinkedIn.
> Thay `[DÁN LINK...]` bằng link thật trước khi đăng.
>
> **Mọi số liệu trong bài đều đã kiểm chứng trong mã nguồn** — không có con số nào bịa.
> Chi tiết đối chiếu ở cuối file.

---

Xin chào Ban tổ chức và cộng đồng #AIRiserVietnam 👋

Một khách Nhật đứng giữa phố cổ Hà Nội, muốn hỏi "quán bún chả nào người địa phương hay ăn" — mở app du lịch ra thì gần như toàn tiếng Việt. Hỏi chatbot thì nó trả lời rất trôi chảy… về một quán không tồn tại. Cách đó ba con phố có một người bản địa biết chính xác câu trả lời, nhưng bác ấy không viết nổi một dòng tiếng Anh để giới thiệu mình.

Hai người cách nhau 300 mét và không có cách nào gặp được nhau.

Còn nếu muốn chắc ăn thì thuê hướng dẫn viên riêng — 50-100 USD/ngày, không phải ai đi 3-4 ngày cũng sẵn sàng chi. Chọn tour đại trà thì mất đúng cái mình đi tìm.

💡 Đó là lý do mình build **ViS-Go — nền tảng nối khách du lịch với host bản địa đã được duyệt danh tính, trợ lý AI không được phép bịa.**

Cách xử lý là một pipeline hai bước, và bước thứ hai mới là điểm khác biệt: **Gemini 3 Flash** trả lời dựa trên catalogue tour thật được nạp thẳng vào prompt — sau đó hệ thống chạy **ngược lại** câu trả lời đó qua một lớp kiểm toán, đối chiếu từng tên tour, tên host và mức giá mà model vừa nhắc tới với dữ liệu thật. Cái nào không tồn tại thì **cả câu trả lời bị hủy**, và engine RAG offline trả lời thay.

Nói cách khác: model không có quyền nói câu cuối cùng. Vì một chatbot du lịch bịa ra tour là lỗi nhỏ trên màn hình nhưng là chuyện lớn ngoài đời — sẽ có người đi tới một địa chỉ không có ai đợi.

🌟 Vài con số cụ thể:

• **3 tầng dự phòng cho trợ lý**: Firebase AI Logic → serverless function → engine RAG chạy ngay trong trình duyệt. Tầng cuối không cần mạng, không cần khóa API, không cần máy chủ — trợ lý không bao giờ trả về màn hình lỗi, nó chỉ bớt thông minh dần.
• **Chuỗi 4 model dự phòng** với deadline 12 giây mỗi model, vì một model được Google nhận request rồi treo luôn còn tệ hơn một model trả về 404.
• **455 dòng Firestore security rules**, kiểm chứng bằng **56 bài test tự động** trên Firestore Emulator — gồm cả các kịch bản lạm dụng: host tự bấm hoàn thành chuyến thay khách, khách hủy sau khi host đã xác nhận, khách tự tắt cảnh báo SOS của chính mình. Tất cả bị chặn ở tầng cơ sở dữ liệu, không phải ở tầng giao diện.
• **Nhận diện ngôn ngữ theo hệ chữ viết** (kana, hangul, hán tự, cyrillic, thái, ả-rập) rồi mới tới dấu tiếng Việt — khách hỏi tiếng Nhật được trả lời bằng tiếng Nhật, dù giao diện đang để tiếng Việt.
• **12 lượt/IP/phút và 800 lượt/ngày** — chốt chi phí tự viết trong server, để một dự án sinh viên không thức dậy với hóa đơn bốn con số.

Bức tường ngôn ngữ được phá ở **cả hai đầu**, không chỉ phía khách. Phía host có một trợ lý viết bài nằm ngay trong form đăng tour: bấm một nút, Gemini viết lại và dịch sang tiếng Anh — nhưng bị cấm bịa giá, giờ hay tên quán, những thứ chỉ host mới biết. AI chỉ đề xuất; host xem rồi mới bấm "Áp dụng vào form".

Và ViS-Go **không giữ tiền của ai**. Khách nhắn tin hoặc gọi cho host trước, đặt chỗ trước, hai bên tự thanh toán trực tiếp theo thỏa thuận. Chỉ khi host bấm xác nhận thì **Gmail API** mới gửi biên nhận thật cho khách và **Google Calendar API** tạo lịch, mời host qua email. Email thật, lịch thật — không phải mô phỏng.

Một chi tiết về tuân thủ pháp luật: từ 01/01/2026, Nghị định 356/2025/NĐ-CP xếp ảnh chụp thẻ căn cước vào dữ liệu cá nhân nhạy cảm. Nên hệ thống **không lưu ảnh giấy tờ tùy thân** — và huy hiệu xác minh được ghi rõ nghĩa là *"đã có người kiểm tra"*, chứ không phải *"đã đối chiếu cơ sở dữ liệu quốc gia"*.

⚙️ Công nghệ Google tích hợp:
• **Google AI Studio** — nơi dự án được khởi tạo và dựng bản đầu tiên.
• **Gemini API** (qua `@google/genai`) — trợ lý RAG cho khách, trợ lý viết/dịch bài cho host, soạn lịch trình tour. System Instruction trên mọi lệnh gọi, temperature điều chỉnh theo tác vụ: 0.7 cho hội thoại, 0.3 cho dịch và biên tập.
• **Firebase AI Logic** — Prompt Template đặt trên console, nên bộ luật của trợ lý không nằm trong bundle và không ai đọc được bằng DevTools.
• **Cloud Firestore + Firebase Authentication + Firebase App Check** (reCAPTCHA v3).
• **Gmail API và Google Calendar API** — chạy bằng tài khoản hệ thống phía máy chủ, gửi đúng ba email theo ba mốc vòng đời: đặt chỗ trước, host xác nhận, khách hủy.

Bước tiếp theo là đưa backend lên Cloud Run (Dockerfile đóng gói cả SPA lẫn API đã viết sẵn), và mở rộng **theo từng thành phố một** thay vì dàn hàng ngang — vì mỗi thành phố cần đủ host được duyệt trước khi mở cho khách, nếu không khách vào chỉ thấy catalogue rỗng rồi không quay lại. Bắt đầu từ Đà Nẵng và Hội An.

🔗 Web app: [DÁN LINK WEBAPP]
🎥 Demo 2 phút: [DÁN LINK YOUTUBE]

Nếu bạn từng hỏi một chatbot du lịch và nhận về một địa chỉ không tồn tại — hoặc bạn là người bản địa từng muốn nhận khách nhưng vướng đúng ở khâu viết tiếng Anh — rất muốn nghe bạn kể lại 🙌

#AIRiserVietnam #BuildwithGoogleAI #Gemini #Firebase #VibeCoding

---
---

## Ghi chú cho bạn (KHÔNG copy phần dưới này)

### Hai dòng đầu quyết định tất cả

LinkedIn cắt bài sau ~2-3 dòng rồi mới hiện nút "…see more". Nên câu "Một khách Nhật đứng
giữa phố cổ Hà Nội…" được đặt lên đầu có chủ đích — nó là câu kéo người ta bấm mở. **Đừng
thêm gì lên trước nó.**

### Đối chiếu số liệu — mọi con số đều lấy từ code

| Câu trong bài | Nguồn kiểm chứng |
|---|---|
| Gemini 3 Flash | `GET /api/status` trên production trả `gemini-3-flash-preview` |
| Chuỗi 4 model, deadline 12 giây | `server/gemini.ts` — `MODEL_CANDIDATES`, `MODEL_TIMEOUT_MS` |
| Lớp kiểm toán hủy câu trả lời bịa | `ViSGoRagEngine.auditAnswer`, `src/utils/ragEngine.ts` |
| 3 tầng dự phòng | `src/utils/firebaseAi.ts` → `/api/rag-chat` → `ragEngine.ts` |
| 455 dòng rules · 56 bài test | `firestore.rules` · `scripts/rules.test.mjs` (56/56 đạt) |
| Nhận diện theo hệ chữ viết | `src/utils/detectLanguage.ts` |
| 12 lượt/IP/phút · 800 lượt/ngày | `server/gemini.ts` |
| Gmail + Calendar theo 3 mốc | `server/workspace.ts` — đã xác minh chạy thật trên production |
| Temperature 0.7 / 0.3 | `server/gemini.ts` |

### Ba thứ tôi cố ý KHÔNG viết vào bài

1. **Không nhắc Google Maps JavaScript API.** Bản đồ hiện dùng Leaflet + OpenStreetMap vì
   Maps JS API bắt buộc bật billing. Viết vào là sai sự thật.
2. **Không nhắc Cloud Run như đã có.** Bài chỉ ghi *"bước tiếp theo là đưa backend lên
   Cloud Run"* — đúng với thực tế.
3. **Không có con số người dùng.** Bạn chưa có analytics. Bài dùng số liệu kỹ thuật kiểm
   chứng được thay cho số người dùng bịa — an toàn hơn nhiều khi có người hỏi lại.

### Nếu muốn bản ngắn hơn

Cắt hai đoạn này, bài vẫn đủ mạch và ngắn hơn ~40%:
- đoạn về Nghị định 356/2025/NĐ-CP
- 2 gạch đầu dòng cuối trong mục 🌟 (nhận diện ngôn ngữ, chốt chi phí)
