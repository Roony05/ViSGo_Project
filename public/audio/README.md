# Nhạc mở đầu

Thả một file tên **`intro.mp3`** vào đúng thư mục này thì đoạn intro sẽ dùng nó
thay cho bản nhạc tổng hợp sẵn trong `src/utils/introMusic.ts`. Không cần sửa
code, không cần khai báo ở đâu cả — app tự phát hiện.

Yêu cầu:

- Tên chính xác: `intro.mp3`
- Dài khoảng **12 giây** (bằng `INTRO_MS`). Dài hơn cũng chạy — nhạc sẽ được
  fade out ở giây thứ 12 chứ không bị cắt cụt.
- Nhẹ thôi, dưới ~200 KB, vì nó tải cùng lúc với lần vào web đầu tiên.

## Vì sao repo không kèm sẵn "Hello Vietnam"

"Hello Vietnam" (nhạc: Marc Lavoine & Yvan Coriat, 2006) vẫn đang trong thời hạn
bảo hộ bản quyền. Cả bản thu lẫn bản hoà tấu không lời đều là tác phẩm phái sinh
của giai điệu đó, nên không thể đóng gói vào mã nguồn này.

Muốn dùng bản đó thì cần một trong hai:

1. Mua/được cấp phép một bản instrumental — rồi đổi tên thành `intro.mp3` và bỏ
   vào đây.
2. Tự thu, tự hoà âm và tự xin phép chủ sở hữu quyền tác giả.

Không làm gì cả thì intro vẫn có nhạc: một đoạn nhạc gốc viết theo **điệu Bắc**
(thang ngũ cung C–D–F–G–A), tổng hợp ngay trong trình duyệt bằng Web Audio, dài
đúng 12 giây và bám theo diễn biến của cảnh — thưa và trầm lúc trời còn tối, mở
ra khi mặt trời lên, về chủ âm dưới dòng tiêu đề. Nặng 0 byte và không bao giờ
lỗi tải.
