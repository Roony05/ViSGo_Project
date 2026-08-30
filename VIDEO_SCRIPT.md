# Kịch bản video demo 2 phút — ViS-Go

> **Quay một lần, không dựng.** Bạn không còn thời gian để edit. Nói vấp cũng kệ, đi tiếp.
> Giám khảo chấm ý tưởng và sản phẩm, không chấm giọng đọc.

---

## PHẦN 0 — Chuẩn bị trước khi bấm ghi (5 phút, đừng bỏ qua)

**Mở sẵn 5 tab này, đúng thứ tự, rồi mới bấm ghi.** Đây là thứ quyết định video có mượt hay không — mọi thao tác lúc quay chỉ còn là chuyển tab.

| Tab | Mở sẵn cái gì |
|---|---|
| 1 | `https://vis-go-ai-riser.netlify.app` — trang chủ, **đã đăng nhập** tài khoản khách |
| 2 | Một trang chi tiết tour bất kỳ (bấm vào 1 tour rồi để đó) |
| 3 | **Gmail** — mở sẵn email biên nhận booking đã có từ trước |
| 4 | **Google Calendar** — mở sẵn tháng có sự kiện `[ViS-Go]` |
| 5 | Trang đăng tour của host, đã cuộn tới chỗ **trợ lý AI viết bài** |

⚠️ **Quan trọng:** nếu bạn **chưa từng** chạy hết một booking thật thì tab 3 và 4 sẽ trống.
Nếu vậy, **làm một booking thật ngay bây giờ** (đặt chỗ → đăng nhập host → bấm xác nhận),
mất khoảng 3 phút, và bạn sẽ có email thật + lịch thật để quay. Đây là bằng chứng Workspace
mạnh nhất trong cả video — đáng bỏ 3 phút.

**Tắt trước khi ghi:** Zalo, Messenger, thông báo Windows. Đóng tab nào đang mở `.env`.

**Công cụ ghi (Windows 11):** bấm `Win + Alt + R` → ghi màn hình luôn. Nhớ bật mic
(`Win + G` → biểu tượng mic). Không có thì dùng điện thoại quay màn hình máy tính cũng được.

---

## PHẦN 1 — Kịch bản 120 giây

**Cách đọc bảng:** cột *MÀN HÌNH* là việc tay bạn làm. Cột *LỜI THOẠI* đọc gần như nguyên văn.
Tổng ~290 từ, vừa đúng 2 phút ở tốc độ nói bình thường. **Đừng nói nhanh hơn** — nói chậm và
rõ ăn điểm hơn nhồi thêm chữ.

---

### ⏱ 0:00 – 0:18 · VẤN ĐỀ

**MÀN HÌNH:** Tab 1 — trang chủ ViS-Go. Cuộn chậm xuống danh sách tour.

> "Khách quốc tế đến Việt Nam gặp hai bức tường cùng lúc. Một: không tìm được người bản địa đáng tin để dẫn đường. Hai: nội dung du lịch giá trị nhất — quán trong hẻm, giờ chùa vắng — chỉ tồn tại bằng tiếng Việt. Ngược lại, host bản địa biết rõ thành phố mình, nhưng không đủ tiếng Anh để tự giới thiệu."

---

### ⏱ 0:18 – 0:30 · GIẢI PHÁP

**MÀN HÌNH:** vẫn tab 1, dừng ở một thẻ tour có ảnh đẹp.

> "ViS-Go nối khách với host đã được duyệt danh tính, và dùng Gemini để phá bức tường ngôn ngữ ở **cả hai đầu**. Đây là sản phẩm đang chạy thật, không phải bản mô phỏng."

---

### ⏱ 0:30 – 0:55 · DEMO 1 — Trợ lý ViS-AI *(điểm mạnh nhất, đừng cắt)*

**MÀN HÌNH:** mở trợ lý ViS-AI. Gõ sẵn trong đầu một câu tiếng Nhật, dán vào cho nhanh:

```
ハノイでおすすめのフードツアーはありますか？
```

*(hoặc tiếng Hàn: `하노이 음식 투어 추천해 주세요`)*

Bấm gửi, đợi câu trả lời hiện ra.

> "Trợ lý ViS-AI chạy Gemini 3 Flash phía máy chủ. Tôi hỏi bằng tiếng Nhật — và nó trả lời bằng tiếng Nhật, dù giao diện đang để tiếng Việt. Quan trọng hơn: mỗi câu trả lời bị đối chiếu ngược lại catalogue thật. Nếu model bịa ra một tour không tồn tại, câu trả lời đó bị hủy. Vì chatbot du lịch bịa tour nghĩa là có người đi tới một nơi không ai đợi."

💡 *Nếu AI trả lời chậm, cứ nói tiếp phần "quan trọng hơn..." trong lúc chờ. Đừng im lặng.*

---

### ⏱ 0:55 – 1:25 · DEMO 2 — Booking + Gmail + Calendar *(bằng chứng Workspace)*

**MÀN HÌNH:** Tab 2 (trang tour) → chỉ vào nút **"Nhắn host"** và **"Gọi host"** → chuyển
sang **Tab 3 (Gmail)** → chuyển sang **Tab 4 (Calendar)**.

> "Trước khi đặt, khách nhắn tin hoặc gọi thẳng cho host để thống nhất lịch. Sau đó đặt chỗ trước — hệ thống **không giữ tiền**, hai bên tự thanh toán trực tiếp. Khi host bấm xác nhận, Gmail API gửi biên nhận thật cho khách…" *(chuyển tab 3, chỉ vào email)* "…và Google Calendar API tạo lịch, mời host qua email." *(chuyển tab 4, chỉ vào sự kiện)* "Đây là email thật và lịch thật trong tài khoản thật."

---

### ⏱ 1:25 – 1:43 · DEMO 3 — Trợ lý viết bài cho host

**MÀN HÌNH:** Tab 5 — form đăng tour. Bấm một tác vụ nhanh, ví dụ **"Tạo bản tiếng Anh"**.
Chờ AI trả lời rồi chỉ vào nút **"Áp dụng vào form"**.

> "Phía host: trợ lý viết bài nằm ngay trong form đăng tour. Host bấm một nút, Gemini viết lại và dịch sang tiếng Anh — nhưng bị cấm bịa giá hay giờ, những thứ chỉ host mới biết. AI chỉ **đề xuất**; host xem rồi mới bấm Áp dụng."

---

### ⏱ 1:43 – 2:00 · CÔNG NGHỆ & KẾT

**MÀN HÌNH:** quay lại Tab 1 — trang chủ.

> "Toàn bộ chạy trên Gemini API, Firebase Authentication, Cloud Firestore với bốn trăm năm mươi lăm dòng security rules, Firebase App Check, Gmail API và Google Calendar API. Riêng bộ luật đó được kiểm chứng bằng năm mươi sáu bài test tự động. ViS-Go — cảm ơn Ban Giám Khảo đã xem."

---

## PHẦN 2 — Bản rút gọn 90 giây (nếu quá gấp)

Bỏ nguyên **DEMO 3** (host AI), giữ lại 4 phần còn lại. Vẫn đủ kể chuyện và vẫn còn
Gmail + Calendar — phần ăn điểm Workspace. **Đừng bỏ DEMO 1.**

---

## PHẦN 3 — Ba quy tắc lúc bấm ghi

1. **Nói vấp thì đi tiếp.** Không quay lại. Một video 2 phút hơi vấp đánh bại một video hoàn hảo nộp muộn 5 phút.
2. **App lỗi thì nói ra và đi tiếp.** "Chỗ này đang tải hơi chậm" nghe chuyên nghiệp hơn là im lặng 8 giây.
3. **Đừng vượt 2:00.** Thể lệ ghi rõ *maximum 2 minutes*. Quá giờ là rủi ro không đáng.

---

## PHẦN 4 — Upload YouTube (làm đúng 4 bước này)

1. youtube.com → **Create** → **Upload video**
2. Tiêu đề: `ViS-Go — AI Riser Vietnam 2026 | #AIRiserVietnam #BuildwithGoogleAI`
3. **"Video này có dành cho trẻ em không?" → chọn KHÔNG.** Bỏ qua bước này là video bị khóa bình luận và có thể ảnh hưởng chia sẻ.
4. Chế độ hiển thị: **Public (Công khai)**.

⚠️ **Đừng để Private.** Thể lệ ghi *"A public YouTube video link"* — Private là giám khảo
không mở được, coi như không nộp.

⏰ **Lấy link ngay khi upload xong, đừng chờ xử lý 100%.** Link hoạt động ngay cả khi
YouTube còn đang xử lý chất lượng cao. **Nộp form trước, YouTube xử lý sau.**

---

## Thứ tự việc còn lại

```
1. Làm 1 booking thật (3 phút)      → để có email + lịch mà quay
2. Mở 5 tab                          (2 phút)
3. Quay 1 lần                        (2 phút)
4. Upload YouTube, lấy link          (5 phút)
5. NỘP FORM ← quan trọng nhất
```

**Nếu tới 23:50 mà video chưa xong: nộp form trước với AI Studio link + LinkedIn, rồi bổ sung video sau nếu form cho sửa. Nộp thiếu vẫn hơn không nộp.**
