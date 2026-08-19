import jsPDF from 'jspdf';
import { Booking } from '../types';

/**
 * Generate a high-resolution, pixel-perfect PDF invoice with 100% accurate Vietnamese typography.
 * Uses an offscreen HTML5 canvas to render Vietnamese diacritics natively without jsPDF font corruption.
 */
export const generateBookingInvoicePDF = (booking: Booking, language: 'en' | 'vi' = 'vi') => {
  const isVi = language === 'vi';

  // Create high-res canvas (A4 ratio: 794 x 1123 at 2x density = 1588 x 2246)
  const canvas = document.createElement('canvas');
  const width = 1588;
  const height = 2246;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Top Header Banner (Lacquer Crimson Red)
  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, '#991B1B');
  gradient.addColorStop(1, '#7F1D1D');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, 240);

  // Gold Accent Line
  ctx.fillStyle = '#D4AF37';
  ctx.fillRect(0, 234, width, 6);

  // Brand Name & Subtitle
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 64px "Playfair Display", Georgia, serif';
  ctx.fillText('ViS-Go', 100, 110);

  ctx.fillStyle = '#FEE2E2';
  ctx.font = '500 24px "Be Vietnam Pro", sans-serif';
  ctx.fillText(
    isVi
      ? 'Trải nghiệm Văn hóa & Bạn đồng hành Bản địa Việt Nam'
      : 'Authentic Local Tour Buddy & Cultural Journeys in Vietnam',
    100,
    165
  );

  // Invoice Title Right Aligned
  ctx.textAlign = 'right';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 44px "Be Vietnam Pro", sans-serif';
  ctx.fillText(isVi ? 'HÓA ĐƠN ĐẶT TOUR' : 'BOOKING RECEIPT', width - 100, 110);

  ctx.fillStyle = '#FEF08A';
  ctx.font = '600 24px "Be Vietnam Pro", sans-serif';
  ctx.fillText(`${isVi ? 'Mã đặt chỗ' : 'Booking Ref'}: #${booking.id}`, width - 100, 165);

  ctx.textAlign = 'left';

  // Status Banner (Escrow Protected)
  ctx.fillStyle = '#F3F4F6';
  ctx.beginPath();
  ctx.roundRect(100, 280, width - 200, 150, 16);
  ctx.fill();

  ctx.fillStyle = '#374151';
  ctx.font = 'bold 24px "Be Vietnam Pro", sans-serif';
  ctx.fillText(isVi ? 'TRẠNG THÁI GIAO DỊCH:' : 'PAYMENT STATUS:', 140, 345);

  ctx.fillStyle = '#059669'; // Emerald
  ctx.font = 'bold 26px "Be Vietnam Pro", sans-serif';
  ctx.fillText(
    isVi
      ? '✓ ĐÃ XÁC NHẬN & BẢO ĐẢM KÝ QUỸ (VIS-GO ESCROW SAFE)'
      : '✓ CONFIRMED & PROTECTED VIA VIS-GO ESCROW',
    520,
    345
  );

  ctx.fillStyle = '#6B7280';
  ctx.font = '400 22px "Be Vietnam Pro", sans-serif';
  ctx.fillText(
    `${isVi ? 'Ngày thanh toán' : 'Issued Date'}: ${booking.createdAt}  |  ${
      isVi ? 'Hình thức' : 'Method'
    }: ${booking.paymentMethod.toUpperCase()}  |  ${isVi ? 'Hỗ trợ khẩn cấp 24/7' : '24/7 Safety Line'}: +84 908 123 456`,
    140,
    395
  );

  // Two Information Cards (Traveler Details & Local Buddy)
  const cardWidth = 664;
  const cardHeight = 310;
  const cardY = 470;

  // Left Card: Traveler
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#E5E7EB';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(100, cardY, cardWidth, cardHeight, 16);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#991B1B';
  ctx.font = 'bold 26px "Be Vietnam Pro", sans-serif';
  ctx.fillText(isVi ? 'THÔNG TIN DU KHÁCH' : 'TRAVELER DETAILS', 140, cardY + 55);

  ctx.fillStyle = '#1F2937';
  ctx.font = '500 22px "Be Vietnam Pro", sans-serif';
  ctx.fillText(`${isVi ? 'Họ và tên' : 'Full Name'}:  ${booking.customerName}`, 140, cardY + 115);
  ctx.fillText(`Email:  ${booking.customerEmail}`, 140, cardY + 165);
  ctx.fillText(`${isVi ? 'Số điện thoại' : 'Phone'}:  ${booking.customerPhone}`, 140, cardY + 215);
  ctx.fillText(
    `${isVi ? 'Số lượng khách' : 'Travelers'}:  ${booking.guestsCount} ${isVi ? 'người' : 'travelers'}`,
    140,
    cardY + 265
  );

  // Right Card: Local Host Buddy
  const rightCardX = width - 100 - cardWidth;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.roundRect(rightCardX, cardY, cardWidth, cardHeight, 16);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#991B1B';
  ctx.font = 'bold 26px "Be Vietnam Pro", sans-serif';
  ctx.fillText(isVi ? 'NGƯỜI BẠN BẢN ĐỊA (HOST)' : 'LOCAL BUDDY (HOST)', rightCardX + 40, cardY + 55);

  ctx.fillStyle = '#1F2937';
  ctx.font = '500 22px "Be Vietnam Pro", sans-serif';
  ctx.fillText(`${isVi ? 'Họ và tên' : 'Full Name'}:  ${booking.hostName}`, rightCardX + 40, cardY + 115);
  ctx.fillText(`${isVi ? 'Số điện thoại / Zalo' : 'Phone / WhatsApp'}:  ${booking.hostPhone}`, rightCardX + 40, cardY + 165);
  ctx.fillText(`${isVi ? 'Thành phố' : 'Base City'}:  ${booking.city}`, rightCardX + 40, cardY + 215);
  ctx.fillText(
    `${isVi ? 'Trạng thái định danh' : 'Identity Status'}:  100% eKYC Verified Buddy`,
    rightCardX + 40,
    cardY + 265
  );

  // Tour Details & Schedule Box (Warm Rose tint)
  const tourBoxY = 820;
  ctx.fillStyle = '#FFF5F5';
  ctx.strokeStyle = '#FECACA';
  ctx.beginPath();
  ctx.roundRect(100, tourBoxY, width - 200, 310, 16);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#991B1B';
  ctx.font = 'bold 26px "Be Vietnam Pro", sans-serif';
  ctx.fillText(isVi ? 'CHI TIẾT TRẢI NGHIỆM VĂN HÓA' : 'EXPERIENCE DETAILS & SCHEDULE', 140, tourBoxY + 55);

  const tourTitle = isVi ? booking.tourTitleVi || booking.tourTitle : booking.tourTitle;
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 28px "Be Vietnam Pro", sans-serif';
  ctx.fillText(`🌟 ${tourTitle}`, 140, tourBoxY + 115);

  ctx.fillStyle = '#374151';
  ctx.font = '500 22px "Be Vietnam Pro", sans-serif';
  ctx.fillText(
    `📅 ${isVi ? 'Thời gian khởi hành' : 'Schedule'}:  ${booking.bookingDate} @ ${booking.bookingTime}`,
    140,
    tourBoxY + 175
  );
  ctx.fillText(
    `📍 ${isVi ? 'Điểm hẹn gặp mặt' : 'Meeting Point'}:  ${booking.meetingPoint}`,
    140,
    tourBoxY + 225
  );
  if (booking.notes) {
    ctx.fillText(
      `💬 ${isVi ? 'Ghi chú du khách' : 'Special Notes'}:  ${booking.notes}`,
      140,
      tourBoxY + 275
    );
  } else {
    ctx.fillText(
      `🛡️ ${isVi ? 'Bảo hiểm chuyến đi' : 'Safety Guarantee'}:  Bao gồm định vị GPS an toàn & Hỗ trợ cứu hộ 24/7`,
      140,
      tourBoxY + 275
    );
  }

  // Breakdown Pricing Table
  const tableY = 1170;
  ctx.fillStyle = '#991B1B';
  ctx.beginPath();
  ctx.roundRect(100, tableY, width - 200, 60, 8);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 22px "Be Vietnam Pro", sans-serif';
  ctx.fillText(isVi ? 'MÔ TẢ KHOẢN MỤC' : 'ITEM DESCRIPTION', 140, tableY + 38);
  ctx.textAlign = 'center';
  ctx.fillText(isVi ? 'SỐ LƯỢNG' : 'QTY', width / 2 + 100, tableY + 38);
  ctx.textAlign = 'right';
  ctx.fillText(isVi ? 'THÀNH TIỀN (VNĐ)' : 'AMOUNT (VND)', width - 140, tableY + 38);

  ctx.textAlign = 'left';
  let itemY = tableY + 110;

  // Line item 1: Tour experience
  ctx.fillStyle = '#1F2937';
  ctx.font = '500 22px "Be Vietnam Pro", sans-serif';
  ctx.fillText(
    isVi ? 'Vé trải nghiệm bản địa & Đồng hành cùng Host' : 'Authentic Tour Experience & Buddy Hosting',
    140,
    itemY
  );
  ctx.textAlign = 'center';
  ctx.fillText(`${booking.guestsCount}x`, width / 2 + 100, itemY);
  ctx.textAlign = 'right';
  ctx.fillText(`${booking.totalPriceVND.toLocaleString('vi-VN')} VND`, width - 140, itemY);

  // Line item 2: Safety & Escrow service fee
  itemY += 60;
  ctx.textAlign = 'left';
  ctx.fillText(
    isVi ? 'Phí bảo hiểm du lịch & Ký quỹ an toàn ViS-Go 24/7' : 'Traveler Safety Insurance & 24/7 Support Escrow',
    140,
    itemY
  );
  ctx.textAlign = 'center';
  ctx.fillText('1x', width / 2 + 100, itemY);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#059669';
  ctx.fillText(isVi ? 'ĐÃ BAO GỒM' : 'INCLUDED', width - 140, itemY);

  // Total divider
  itemY += 40;
  ctx.strokeStyle = '#D1D5DB';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(100, itemY);
  ctx.lineTo(width - 100, itemY);
  ctx.stroke();

  // Grand Total
  itemY += 70;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#991B1B';
  ctx.font = 'bold 32px "Be Vietnam Pro", sans-serif';
  ctx.fillText(isVi ? 'TỔNG CỘNG THANH TOÁN' : 'TOTAL PAID AMOUNT', 140, itemY);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#991B1B';
  ctx.font = 'bold 36px "Be Vietnam Pro", sans-serif';
  ctx.fillText(
    `${booking.totalPriceVND.toLocaleString('vi-VN')} VND (~$${booking.totalPriceUSD})`,
    width - 140,
    itemY
  );

  // Escrow Safety Stamp & Footnote
  const footerY = 1600;
  ctx.fillStyle = '#FAF7F2';
  ctx.strokeStyle = '#E7E0D3';
  ctx.beginPath();
  ctx.roundRect(100, footerY, width - 200, 220, 16);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#B45309';
  ctx.font = 'bold 24px "Be Vietnam Pro", sans-serif';
  ctx.fillText('🛡️ ViS-Go Verified Security Guarantee (100% Escrow Protection)', 140, footerY + 55);

  ctx.fillStyle = '#4B5563';
  ctx.font = '400 20px "Be Vietnam Pro", sans-serif';
  ctx.fillText(
    isVi
      ? 'Hóa đơn này xác thực quyền tham gia trải nghiệm. Khoản thanh toán của bạn được giữ an toàn trong quỹ ký quỹ ViS-Go'
      : 'This receipt confirms your tour participation. Your payment is held securely in the ViS-Go Escrow Vault',
    140,
    footerY + 105
  );
  ctx.fillText(
    isVi
      ? 'và chỉ giải ngân cho Host sau khi chuyến đi hoàn tất tốt đẹp. Hỗ trợ khẩn cấp 24/7: +84 908 123 456.'
      : 'and is only released to your host upon successful journey completion. 24/7 Support Hotline: +84 908 123 456.',
    140,
    footerY + 145
  );

  // Visual Official Stamp Badge
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 3;
  ctx.strokeRect(width - 420, footerY + 30, 280, 150);

  ctx.fillStyle = '#D4AF37';
  ctx.textAlign = 'center';
  ctx.font = 'bold 20px "Be Vietnam Pro", sans-serif';
  ctx.fillText('VIS-GO VIETNAM', width - 280, footerY + 75);
  ctx.font = 'bold 22px "Be Vietnam Pro", sans-serif';
  ctx.fillText('ESCROW VERIFIED', width - 280, footerY + 110);
  ctx.font = '500 16px "Be Vietnam Pro", sans-serif';
  ctx.fillText('SECURE PAYMENT', width - 280, footerY + 145);

  // Bottom Copyright
  ctx.fillStyle = '#9CA3AF';
  ctx.font = '400 18px "Be Vietnam Pro", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ViS-Go Platform • https://visgo.vn • Email: contact@visgo.vn', width / 2, height - 80);

  // Render to jsPDF
  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
  pdf.save(`ViSGo-HoaDon-${booking.id}.pdf`);
};
