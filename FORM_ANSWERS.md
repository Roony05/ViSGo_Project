# Câu trả lời form nộp bài — ViS-Go | #AIRiserVietnam 2026

> **Cách dùng:** mỗi mục dưới đây tương ứng một câu hỏi trong form. Copy phần trong khung
> trả lời, dán thẳng vào form.
>
> **Mọi con số và tên công nghệ trong file này đều đã được kiểm chứng trong mã nguồn**
> (ngày 30/08/2026). Chỗ nào tôi không có dữ liệu thật thì để `[...]` để bạn tự điền —
> **đừng bịa số**, giám khảo có thể mở app kiểm tra.

---

## Câu 1 — Trình bày tổng quan VẤN ĐỀ bạn muốn giải quyết

Khách du lịch quốc tế tới Việt Nam va phải hai bức tường cùng lúc. Thứ nhất là **niềm tin**: họ không có cách nào tìm được một người bản địa đã được kiểm tra danh tính để dẫn đường, nên phải chọn giữa tour đại trà đắt đỏ và lời rao trên mạng xã hội không ai bảo chứng. Thứ hai là **ngôn ngữ**: phần lớn nội dung du lịch có giá trị nhất — quán ăn trong hẻm, giờ chùa vắng, mẹo đi lại — chỉ tồn tại bằng tiếng Việt.

Ở chiều ngược lại, người bản địa có kiến thức thật lại bị chặn bởi đúng bức tường thứ hai. Họ biết rõ thành phố của mình nhưng **không đủ tiếng Anh để tự viết một bài giới thiệu tour**, nên không tiếp cận được nhóm khách sẵn sàng trả tiền nhất. Kết quả là giá trị nằm im ở cả hai phía: khách không tìm được người, người không tìm được khách.

Chưa kể một vấn đề thứ ba, ít ai nói nhưng ai cũng lo: **an toàn khi hai người lạ hẹn gặp nhau ngoài đời**. Đây là rào cản tâm lý thật, đặc biệt với khách nữ đi một mình.

Ba vấn đề này không tách rời được. Giải quyết mỗi ngôn ngữ mà không giải quyết niềm tin thì không ai dám đặt; giải quyết niềm tin mà không giải quyết ngôn ngữ thì host Việt vẫn đứng ngoài cuộc.

---

## Câu 2 — Tổng quan GIẢI PHÁP và vì sao nó phù hợp với vấn đề

**ViS-Go** là nền tảng P2P nối khách du lịch với host bản địa đã khai và được duyệt danh tính, dùng AI đúng ở ba chỗ mà con người làm chậm hoặc làm không nổi.

**Tính năng cốt lõi**

1. **Trợ lý ViS-AI (RAG trên catalogue thật)** — trả lời câu hỏi về tour, host, giá, lịch trình **bằng đúng ngôn ngữ khách hỏi**, và bị ràng buộc chỉ được nói những gì có thật trong dữ liệu. Đây là câu trả lời trực tiếp cho bức tường ngôn ngữ.
2. **Trợ lý viết bài cho host** — chatbot ngay trong form đăng tour, giúp host viết hay hơn hoặc dịch sang tiếng Anh, nhưng **không được phép bịa ra sự thật** (giá, giờ, tên quán) mà chỉ host mới biết. Nó gỡ đúng rào cản khiến host Việt không đăng được tour.
3. **Vòng đời booking có kiểm soát** — khách trao đổi với host trước, đặt chỗ trước (`pending`), host tự thu xếp và xác nhận, khách xác nhận hoàn thành rồi đánh giá. **Hệ thống không thu và không giữ tiền**: hai bên tự thanh toán trực tiếp, đúng thực tế vận hành ở Việt Nam.
4. **Lớp an toàn** — GPS Radar chỉ bật trong khung giờ quanh buổi hẹn và tự tắt, cộng nút SOS gửi tọa độ tới hàng đợi quản trị viên ViS-Go. Nêu rõ: **hệ thống không tự động liên hệ công an**, và cảnh báo đã gửi chỉ admin mới được đóng.

**Vì sao phù hợp.** Ba vấn đề ở Câu 1 đều là vấn đề *thông tin*, không phải vấn đề vận tải hay thanh toán. Không cần đội ngũ vận hành, không cần ví điện tử, không cần giấy phép lữ hành — chỉ cần dịch đúng, xác thực đủ và ghi lại minh bạch. Đó là lý do một nền tảng nhẹ + AI giải được, trong khi mô hình công ty tour truyền thống phải gánh chi phí cố định lớn hơn nhiều.

**Kiến trúc & độ phức tạp.** React 19 + Vite 6 + TypeScript (~28.500 dòng), Cloud Firestore làm cơ sở dữ liệu với **455 dòng security rules**, backend là các handler framework-agnostic chạy được trên cả Express, Vite dev server lẫn serverless function. Gemini được gọi **hoàn toàn phía máy chủ** — khóa API không bao giờ vào bundle trình duyệt, và điều này được kiểm chứng tự động trong quy trình build.

**UI/UX.** Toàn bộ song ngữ Việt–Anh. Khách đi từ trang tour tới đặt chỗ trong 3 bước, và ở ngay bước đó được khuyến khích nhắn/gọi host trước để thống nhất lịch — thiết kế có chủ đích, vì một cuộc trao đổi 2 phút trước khi đặt loại bỏ gần hết lý do hủy về sau.

---

## Câu 3 — Điểm ĐỘC ĐÁO và ĐẶC BIỆT

**1. AI bị kiểm toán trước khi khách nhìn thấy — đây là điểm khác biệt lớn nhất.**

Mỗi câu trả lời của Gemini được **đối chiếu ngược lại chính catalogue mà nó được cho xem** (`ViSGoRagEngine.auditAnswer`, `src/utils/ragEngine.ts`). Nếu câu trả lời nhắc tới một tour, một host hoặc một mức giá không tồn tại, câu trả lời đó **bị hủy** và engine offline trả lời thay.

Vì sao điều này quan trọng hơn nó nghe: một chatbot du lịch bịa ra tour là lỗi nhỏ trên màn hình nhưng là chuyện lớn ngoài đời — sẽ có người đi tới một địa chỉ không có ai đợi. Hầu hết chatbot RAG dừng ở "đưa context vào prompt rồi hy vọng"; ViS-Go kiểm lại đầu ra và dám vứt bỏ câu trả lời của chính model.

**2. Ba tầng dự phòng — trợ lý không bao giờ chết.**

```
Firebase AI Logic  →  /api/rag-chat (serverless)  →  engine RAG chạy trong trình duyệt
```

Tầng cuối **không cần mạng, không cần khóa, không cần máy chủ**. Trợ lý không bao giờ trả về màn hình lỗi — nó chỉ bớt thông minh dần. Với một cuộc thi mà giám khảo bấm thử vào giờ cao điểm, đây là khác biệt giữa "ấn tượng" và "app hỏng".

**3. Trả lời đúng ngôn ngữ người hỏi, kể cả ngôn ngữ thứ ba.**

`src/utils/detectLanguage.ts` nhận diện theo **hệ chữ viết** (kana, hangul, hán tự, cyrillic, thái, ả-rập) rồi mới tới dấu tiếng Việt. Khách hỏi bằng tiếng Nhật được trả lời bằng tiếng Nhật, dù giao diện đang để tiếng Anh. Chi tiết quyết định: bộ lọc chủ đề chấm điểm bằng từ khóa Việt–Anh, nên câu hỏi tiếng Nhật từng bị gán nhầm là lạc đề; giờ khi tin nhắn không phải vi/en, hệ thống **không tự phán xét** mà giao cho Gemini — vốn đọc được thứ tiếng đó.

**4. Bảo mật và tuân thủ pháp luật được thiết kế từ đầu, không vá sau.**

- **Không lưu ảnh giấy tờ tùy thân.** Từ 01/01/2026, Nghị định 356/2025/NĐ-CP xếp ảnh chụp thẻ căn cước vào dữ liệu cá nhân nhạy cảm. Hệ thống chỉ lưu thông tin host tự khai — nên huy hiệu xác minh được ghi rõ nghĩa là *"đã có người kiểm tra"*, không phải *"đã đối chiếu cơ sở dữ liệu quốc gia"*.
- **455 dòng Firestore rules được kiểm chứng bằng 56 bài test tự động** chạy trên Firestore Emulator, gồm cả các ca tấn công: host tự hoàn thành chuyến thay khách, khách hủy sau khi host đã xác nhận, khách tự tắt cảnh báo SOS của chính mình, tạo đánh giá cho booking chưa hoàn thành. Tất cả đều bị từ chối ở tầng cơ sở dữ liệu, không phải ở tầng giao diện.
- **Đặt chỗ là một transaction nguyên tử**: booking được tạo và tour bị khóa trong cùng một thao tác, nên hai khách bấm đặt cùng lúc không thể cùng giữ một chỗ.

---

## Câu 4 — Kế hoạch phát triển và mở rộng quy mô

**Trụ cột 1 — Hạ tầng và chi phí (0–3 tháng).**
Đưa backend lên **Google Cloud Run** để tận dụng auto-scaling và scale-to-zero: dự án đã có sẵn `Dockerfile` đa tầng đóng gói cả SPA lẫn API vào một image, nên việc này là một lệnh triển khai chứ không phải viết lại. Về chi phí token, hệ thống đã có sẵn hai chốt tự viết trong `server/gemini.ts` — **12 lượt/IP/phút và 800 lượt/ngày** — cộng cache theo vân tay câu hỏi; bước tiếp theo là chuyển chốt này sang Firestore để nhiều instance Cloud Run dùng chung hạn mức thay vì mỗi instance một bộ đếm.

**Trụ cột 2 — Lộ trình tính năng (3–6 tháng).**
- **Thanh toán đặt cọc qua VNPay/MoMo** để giảm tỷ lệ khách đặt rồi không tới — hiện hệ thống cố ý đứng ngoài dòng tiền, và đây là bước có chủ đích tiếp theo.
- **Ứng dụng di động phát hành trên Google Play**, vì lớp GPS Radar và SOS hoạt động đúng nghĩa nhất khi chạy nền trên điện thoại.
- **Gemini multimodal cho khâu đăng tour**: host chụp ảnh địa điểm, model gợi ý tiêu đề, mô tả và phân loại — rút ngắn thời gian đăng một tour từ ~15 phút xuống dưới 2 phút, tấn công trực diện rào cản lớn nhất của host Việt.
- **Bật Google Maps JS API** thay cho Leaflet khi có billing, để dùng Places và Directions thật.

**Trụ cột 3 — Người dùng và mô hình.**
Mở rộng theo **từng thành phố một**, không dàn hàng ngang: mỗi thành phố cần đủ host được duyệt trước khi mở cho khách, nếu không khách vào sẽ thấy catalogue rỗng và không quay lại. Bắt đầu từ Đà Nẵng và Hội An — nơi mật độ khách quốc tế trên đầu người cao nhất và quãng đường di chuyển ngắn.

Mô hình doanh thu là **hoa hồng nền tảng do host trả** (`platformFeeVND` đã có sẵn trong dữ liệu booking và hiển thị trên dashboard của host), không thu thêm của khách. Chọn cách này vì host là bên có lợi ích lặp lại; thu của khách sẽ đẩy giá lên cao hơn tour truyền thống và mất đi lợi thế duy nhất.

---

## Câu 5 — Bạn có tích hợp các Công nghệ của Google không?

```
Có
```

---

## Câu 6 — Mô tả chi tiết các công nghệ Google đã tích hợp

**1. Google AI Studio** — toàn bộ dự án được khởi tạo và dựng bản đầu tiên trong AI Studio (`metadata.json` khai `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API`), sau đó phát triển tiếp trên máy.

**2. Gemini API (server-side)** — trụ cột AI của sản phẩm, chạy qua `@google/genai` trong `server/gemini.ts` (1.022 dòng).
- **Model đang chạy thật: `gemini-3-flash-preview`**, có chuỗi dự phòng 4 model (`gemini-3.1-flash-lite` → `gemini-flash-lite-latest` → `gemini-flash-latest`) với deadline 12 giây mỗi model, để một model treo không làm treo cả trình duyệt.
- **System Instruction** trên mọi lệnh gọi, buộc model chỉ nói trong phạm vi catalogue.
- **Temperature điều chỉnh theo tác vụ**: 0.7 cho hội thoại, 0.3 cho dịch và biên tập (đây là việc cần trung thành, không cần sáng tạo), 0.6 cho trợ lý viết bài.
- Ba đầu việc thật: trợ lý RAG cho khách, trợ lý viết/dịch bài cho host, và soạn lịch trình tour.

**3. Firebase AI Logic** — đường gọi Gemini không cần máy chủ, dùng **Prompt Template** (`visgo-chat`, `visgo-translate`) đặt trên Firebase console. Ý nghĩa thật: bộ luật của trợ lý nằm trên console chứ không nằm trong bundle, nên **không ai đọc được prompt bằng cách mở DevTools**. Đây là tầng 1 trong ba tầng dự phòng.

**4. Firebase Authentication** — đăng nhập và phân vai khách / host / quản trị viên.

**5. Cloud Firestore** — tour, booking, hội thoại, tin nhắn, đánh giá, hồ sơ định danh, hàng đợi SOS. Kèm **455 dòng security rules** quyết định toàn bộ luồng nghiệp vụ ở tầng cơ sở dữ liệu (ai được xác nhận booking, ai được hủy, ai được đánh giá), kiểm chứng bằng **56 bài test tự động trên Firestore Emulator**.

**6. Firebase App Check (reCAPTCHA v3)** — chặn người lạ gọi ké quota AI của dự án.

**7. Gmail API (tài khoản hệ thống, OAuth refresh token phía máy chủ)** — gửi tự động **ba email theo đúng mốc vòng đời**, không phải một email chung chung:
- khách đặt chỗ trước → gửi biên bản cho khách **và** thông báo cho host;
- host xác nhận → gửi **biên nhận xác nhận** cho khách;
- khách hủy khi đang chờ → báo cho cả hai bên.

**8. Google Calendar API** — khi và chỉ khi host bấm xác nhận, hệ thống tạo sự kiện và **mời host qua email** (`sendUpdates=all`), kèm địa điểm hẹn và nhắc trước 60 phút. Event id là hash tất định từ mã booking, nên một lần thử lại không bao giờ tạo lịch trùng.

**9. Google Maps** — mở tọa độ, chỉ đường và điểm hẹn qua deep link Google Maps (`src/utils/googleMaps.ts`), dùng ở màn hình GPS Radar và trong hàng đợi SOS của quản trị viên.

> **Ghi chú trung thực:** phần *vẽ bản đồ* hiện dùng Leaflet + OpenStreetMap thay cho Google Maps JavaScript API, vì API đó bắt buộc bật billing mà dự án cố ý giữ chi phí ở mức $0. Mã tích hợp Maps JS API đã có sẵn trong repo và chỉ cần một API key để bật.

**Những công nghệ này đã giúp gì cho bài toán:** Gemini gỡ bức tường ngôn ngữ ở cả hai đầu (khách hỏi bằng tiếng mẹ đẻ, host viết được bài tiếng Anh); Firestore rules biến các cam kết về an toàn và minh bạch thành ràng buộc kỹ thuật không thể lách bằng cách sửa giao diện; Gmail và Calendar biến một dòng trạng thái trong cơ sở dữ liệu thành thứ hai người thật sự tin được — một biên nhận trong hộp thư và một lịch hẹn trên điện thoại.

---

## Câu 7 — Bạn đã triển khai (deploy) hoặc xuất bản ứng dụng chưa?

```
Rồi
```

---

## Câu 8 — Đường dẫn ứng dụng trên Google Cloud Run hoặc Google Play Console

> ⚠️ **Đọc kỹ trước khi dán.** Ứng dụng **đang chạy công khai**, nhưng trên **Netlify**, không phải Cloud Run — vì tài khoản Google Cloud chưa hoàn tất được bước xác minh thẻ thanh toán. Theo thể lệ, 10 điểm bonus Deployment yêu cầu *"must be hosted on Google Cloud Run only"*, nên **link này sẽ không được tính 10 điểm đó**. Vẫn nên dán để giám khảo bấm vào dùng thử được — điều đó phục vụ 100 điểm Idea Evaluation.
>
> Nếu ô này **bắt buộc**, dán nguyên đoạn dưới. Nếu ô này **không bắt buộc**, bạn có thể để trống và đưa link vào phần mô tả.

```
https://vis-go-ai-riser.netlify.app

(Lưu ý: ứng dụng đang chạy công khai trên Netlify, không phải Cloud Run — tài khoản
Google Cloud của tôi chưa hoàn tất được bước xác minh thẻ thanh toán nên chưa bật được
billing. Dự án đã chuẩn bị sẵn Dockerfile đóng gói cả SPA và API cho Cloud Run và sẽ
triển khai ngay khi billing được duyệt. Tôi hiểu link này không đủ điều kiện nhận 10
điểm bonus Deployment, và gửi kèm chỉ để Ban Giám Khảo dùng thử được sản phẩm thật.)
```

---

## Câu 9 — Dữ liệu / câu chuyện về tương tác người dùng thực tế

> 🛑 **Đây là câu tôi KHÔNG thể viết thay bạn.** Dự án chưa có hệ thống analytics, nên tôi
> không có bất kỳ con số người dùng thật nào để đưa vào. **Tuyệt đối đừng bịa số** — mục
> này dành cho Top 50 Gold Tier, giám khảo sẽ soi, và một con số bịa bị phát hiện gây hại
> nhiều hơn là bỏ trống.
>
> Hãy điền những gì **có thật**. Nếu bạn từng cho ai đó dùng thử — bạn bè, người nhà, bạn
> cùng lớp, một host thật, ai đó ở buổi workshop GDG — thì đó **là** dữ liệu tương tác.
> Dùng khung dưới đây và thay `[...]` bằng sự thật:

```
Ứng dụng hiện ở giai đoạn nguyên mẫu hoạt động được, đã triển khai công khai và đang
chạy trên hạ tầng thật (Firebase Authentication, Cloud Firestore, Gemini API, Gmail API
và Google Calendar API đều đã được cấu hình và hoạt động ở môi trường production).

Về kiểm thử thực tế: tôi đã chạy [SỐ] phiên dùng thử có người thật với [MÔ TẢ NGƯỜI DÙNG:
ví dụ "3 bạn cùng lớp đóng vai khách du lịch và 1 người quen làm hướng dẫn viên tự do ở
Đà Nẵng đóng vai host"]. Toàn bộ luồng đã được đi hết đầu-cuối trên dữ liệu thật: khách
nhắn tin cho host trước khi đặt, đặt chỗ trước, host xác nhận, hệ thống gửi email biên
nhận thật và tạo lịch Google Calendar thật, khách xác nhận hoàn thành và để lại đánh giá.

Phản hồi đáng chú ý nhất tôi thu được: [MỘT CÂU NGƯỜI DÙNG THẬT SỰ ĐÃ NÓI — ví dụ
"bạn thử của tôi nói phần khuyên nhắn host trước khi đặt làm bạn ấy yên tâm hơn hẳn so
với việc bấm đặt ngay"]. Từ phản hồi này tôi đã thay đổi [ĐIỀU BẠN ĐÃ SỬA].

Về độ tin cậy kỹ thuật, tôi có bằng chứng kiểm thử tự động thay cho số liệu người dùng ở
giai đoạn này: 56 bài test bảo mật Firestore chạy trên emulator (bao gồm các kịch bản
lạm dụng như host tự hoàn thành chuyến thay khách, hoặc khách tự tắt cảnh báo SOS của
mình) cùng 53 bài test tích hợp chạy trên Firebase thật — tất cả đều đạt.

Kế hoạch thu thập dữ liệu người dùng tiếp theo: [VÍ DỤ "mở thử nghiệm giới hạn với 10
host tại Đà Nẵng trong tháng 9/2026 và đo tỷ lệ booking được host xác nhận"].
```

**Nếu bạn thật sự chưa cho ai dùng thử**, hãy viết ngắn gọn và trung thực: nêu rằng sản phẩm đang ở giai đoạn nguyên mẫu đã deploy, liệt kê bằng chứng kiểm thử tự động (109 bài test đều đạt) và kế hoạch thử nghiệm sắp tới. **Trung thực và ngắn vẫn tốt hơn dài mà bịa.**

---

## Phụ lục — Số liệu đã kiểm chứng (dùng khi form hỏi thêm)

| Hạng mục | Con số | Nguồn |
|---|---|---|
| Mã nguồn TypeScript/TSX | ~28.568 dòng | `src/`, `server/`, `netlify/` |
| Firestore security rules | 455 dòng | `firestore.rules` |
| Logic Gemini phía máy chủ | 1.022 dòng | `server/gemini.ts` |
| Engine RAG | 1.151 dòng | `src/utils/ragEngine.ts` |
| Test bảo mật rules (emulator) | 56/56 đạt | `scripts/rules.test.mjs` |
| Test tích hợp (Firebase thật) | 53/53 đạt | avatars 10 · kyc 19 · videos 11 · hostchat 13 |
| Model Gemini đang chạy | `gemini-3-flash-preview` | `GET /api/status` trên production |
| Chốt chi phí AI | 12 lượt/IP/phút · 800 lượt/ngày | `server/gemini.ts` |
| Catalogue mẫu | 6 tour · 6 host có tài khoản thật | `seed/fixtures.ts` |
| Địa danh VR | 18 điểm | `src/data/vrLandmarks.ts` |

**Kiểm chứng khóa không lọt vào bundle trình duyệt** (giám khảo có thể tự chạy):

```bash
grep -r "AQ\.Ab" dist/          # rỗng — khóa Gemini
grep -r "You are ViS-AI" dist/  # rỗng — system prompt nằm trên máy chủ
```
