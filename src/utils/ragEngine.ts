import { Tour, User, Booking, Language } from '../types';

export interface RagActionItem {
  type: 'tour' | 'city' | 'booking' | 'host' | 'policy';
  id?: string;
  label: string;
  payload?: any;
}

export interface RagResponse {
  answer: string;
  sourceTours: Tour[];
  sourceHosts: User[];
  actionItems: RagActionItem[];
  suggestedFollowups: string[];
}

export class ViSGoRagEngine {
  /**
   * Build indexed context string from live app state
   */
  static buildKnowledgeContext(
    tours: Tour[],
    hosts: User[],
    bookings: Booking[],
    activeUser: User | null,
    language: Language
  ): string {
    const isVi = language === 'vi';

    // 1. Tours catalog summary
    const toursSummary = tours
      .map((t, idx) => {
        const title = isVi ? t.titleVi || t.title : t.title;
        const desc = isVi ? t.descriptionVi || t.description : t.description;
        const meeting = isVi ? t.meetingPointVi || t.meetingPoint : t.meetingPoint;
        const inclusions = isVi ? (t.includedVi || t.included).join(', ') : t.included.join(', ');
        return `[Tour #${idx + 1} - ID: ${t.id}]
- Title: ${title}
- City: ${t.city}
- Category: ${t.category}
- Duration: ${t.durationHours} hours
- Price: ${t.priceVND.toLocaleString('vi-VN')} VND (~$${t.priceUSD} USD) per person
- Host: ${t.hostName} (Rating: ${t.hostRating}★ / ${t.hostReviewCount} reviews, Verified: ${t.hostVerified ? 'YES' : 'NO'}, Spoken Languages: ${(t.hostLanguages || t.languages).join(', ')})
- Meeting Point: ${meeting}
- Inclusions: ${inclusions}
- Max group size: ${t.maxGroupSize} pax
- Highlights/Description: ${desc.slice(0, 200)}...`;
      })
      .join('\n\n');

    // 2. Hosts directory summary
    const hostsSummary = hosts
      .map((h, idx) => {
        const bio = isVi ? h.bioVi || h.bio : h.bio || h.bioVi;
        return `[Host #${idx + 1} - ${h.name}]
- City: ${h.city || 'Vietnam'}
- Languages: ${(h.languages || ['Tiếng Việt', 'English']).join(', ')}
- Specialties: ${(h.specialties || ['Street Food', 'Cultural Stories']).join(', ')}
- Rating: ${h.rating || 5.0}★
- Verified: ${h.verified ? 'eKYC Verified' : 'Standard'}
- Bio: ${bio || 'Passionate local host sharing authentic Vietnamese living.'}`;
      })
      .join('\n\n');

    // 3. Platform Policies & Trust
    const platformPolicies = `[ViS-Go Platform Policies & Safety Guarantees]:
- 100% ViS-Go Escrow Protection: Payments are held safely in escrow and only released to the local buddy after the tour is completed satisfactorily.
- Cancellation Policy: 100% full refund if cancelled up to 24 hours prior to tour departure.
- Safety & eKYC: All hosts undergo biometric national ID (CCCD) / passport verification and criminal record screening.
- Emergency SOS & Live GPS Radar: Real-time location tracking between guest and host, supported by 24/7 hotline (+84 908 123 456).
- Payments accepted: VietQR, VNPay, MoMo, Visa/Mastercard/JCB, Cash on arrival (for certified guests).
- Tipping etiquette: Optional in Vietnam, 50,000₫ - 100,000₫ (~$2-$4) is appreciated for exceptional local guides.`;

    // 4. User's active bookings context
    let userBookingsContext = 'User has no active bookings.';
    if (activeUser && bookings.length > 0) {
      const userBookings = bookings.filter((b) => b.customerId === activeUser.id || b.customerEmail === activeUser.email);
      if (userBookings.length > 0) {
        userBookingsContext = userBookings
          .map(
            (b) =>
              `- Booking ID: ${b.id} | Tour: ${b.tourTitle} | Date: ${b.bookingDate} @ ${b.bookingTime} | Host: ${b.hostName} (Phone: ${b.hostPhone}) | Status: ${b.status} | Guests: ${b.guestsCount}`
          )
          .join('\n');
      }
    }

    return `=== VIS-GO TOURS CATALOG ===\n${toursSummary}\n\n=== VERIFIED LOCAL HOSTS ===\n${hostsSummary}\n\n=== PLATFORM POLICIES & TRUST ===\n${platformPolicies}\n\n=== USER ACTIVE TRIPS ===\n${userBookingsContext}`;
  }

  /**
   * Retrieve relevant tours & hosts based on query keywords / semantic match
   */
  static retrieveRelevantData(query: string, tours: Tour[], hosts: User[]) {
    const q = query.toLowerCase().trim();
    const words = q.split(/\s+/).filter((w) => w.length > 1);

    // City matches
    const cityKeywords: Record<string, string[]> = {
      'Hà Nội': ['hà nội', 'hanoi', 'ha noi', 'phố cổ', 'old quarter', 'hồ gươm', 'hoan kiem', 'tây hồ', 'trứng', 'hồ tây'],
      'TP. Hồ Chí Minh': ['hồ chí minh', 'sài gòn', 'saigon', 'hcmc', 'quận 1', 'chợ bến thành', 'bùi viện', 'district 1'],
      'Đà Nẵng': ['đà nẵng', 'da nang', 'danang', 'cầu rồng', 'mỹ khê', 'bà nà', 'sơn trà'],
      'Hội An': ['hội an', 'hoi an', 'hoian', 'phố cổ hội an', 'đèn lồng', 'chùa cầu', 'thu bồn'],
      'Đà Lạt': ['đà lạt', 'da lat', 'dalat', 'lâm đồng', 'hồ xuân hương', 'hoa', 'sương mù'],
      'Huế': ['huế', 'hue', 'cố đô', 'đại nội', 'sông hương', 'lăng tẩm', 'bún bò huế'],
      'Ninh Bình': ['ninh bình', 'ninh binh', 'tràng an', 'tam cốc', 'bái đính', 'hang múa'],
      'Sa Pa': ['sa pa', 'sapa', 'fansipan', 'fansipan', 'bản cát cát', 'mường hoa', 'ruộng bậc thang'],
    };

    // Category / theme keywords
    const isFood = /ăn|ẩm thực|food|phở|bún|bánh mì|cà phê|coffee|egg coffee|street food|taste|dish|quán/i.test(q);
    const isNight = /đêm|night|pub|bar|rooftop|bia|beer|tối|evening/i.test(q);
    const isHistory = /lịch sử|history|heritage|chùa|pagoda|bảo tàng|museum|văn hóa|culture|di tích/i.test(q);
    const isScooter = /xe máy|scooter|vespa|motorcycle|lái xe|chở/i.test(q);
    const isBudget = /rẻ|budget|tiết kiệm|dưới|under|cheap|giá tốt/i.test(q);

    // Score tours
    const scoredTours = tours.map((tour) => {
      let score = 0;
      const combinedText = `${tour.title} ${tour.titleVi} ${tour.city} ${tour.category} ${tour.description} ${tour.descriptionVi} ${tour.tagline} ${tour.taglineVi} ${tour.included.join(' ')} ${tour.hostName}`.toLowerCase();

      // Keyword match
      words.forEach((w) => {
        if (combinedText.includes(w)) score += 2;
      });

      // City match
      for (const [cityName, kws] of Object.entries(cityKeywords)) {
        if (tour.city === cityName && kws.some((kw) => q.includes(kw))) {
          score += 5;
        }
      }

      // Theme match
      if (isFood && (tour.category === 'street-food' || combinedText.includes('food') || combinedText.includes('ăn'))) score += 4;
      if (isNight && (tour.category === 'nightlife' || combinedText.includes('night') || combinedText.includes('đêm'))) score += 4;
      if (isHistory && (tour.category === 'heritage' || combinedText.includes('lịch sử') || combinedText.includes('history'))) score += 4;
      if (isScooter && combinedText.includes('vespa') || combinedText.includes('scooter') || combinedText.includes('xe máy')) score += 4;
      if (isBudget && tour.priceVND <= 700000) score += 3;

      return { tour, score };
    });

    scoredTours.sort((a, b) => b.score - a.score);
    const topTours = scoredTours.filter((st) => st.score > 0).slice(0, 3).map((st) => st.tour);

    // If none matched, provide featured or top-rated
    const finalTours = topTours.length > 0 ? topTours : tours.slice(0, 3);

    // Filter matching hosts
    const matchedHosts = hosts.filter((h) => {
      const hText = `${h.name} ${h.bio} ${h.bioVi} ${h.city} ${(h.languages || []).join(' ')} ${(h.specialties || []).join(' ')}`.toLowerCase();
      return words.some((w) => hText.includes(w));
    }).slice(0, 2);

    return {
      topTours: finalTours,
      matchedHosts: matchedHosts.length > 0 ? matchedHosts : hosts.slice(0, 2),
    };
  }

  /**
   * Process Chat Query with RAG: Server Gemini API + Intelligent Fallback
   */
  static async queryRag(
    userMessage: string,
    tours: Tour[],
    hosts: User[],
    bookings: Booking[],
    activeUser: User | null,
    history: { role: string; text: string }[],
    language: Language
  ): Promise<RagResponse> {
    const isVi = language === 'vi';
    const { topTours, matchedHosts } = this.retrieveRelevantData(userMessage, tours, hosts);
    const context = this.buildKnowledgeContext(tours, hosts, bookings, activeUser, language);

    // Prepare Action Items
    const actionItems: RagActionItem[] = [];
    topTours.forEach((t) => {
      actionItems.push({
        type: 'tour',
        id: t.id,
        label: isVi ? `📍 Xem tour: ${t.titleVi || t.title}` : `📍 View tour: ${t.title}`,
        payload: t,
      });
    });

    if (topTours.length > 0) {
      actionItems.push({
        type: 'city',
        label: isVi ? `🛵 Khám phá tour tại ${topTours[0].city}` : `🛵 Explore ${topTours[0].city} tours`,
        payload: topTours[0].city,
      });
    }

    // Check if query is clearly off-topic (outside of Vietnam tourism & culture & ViS-Go services)
    const offTopicKeywords = [
      'nước đức', 'germany', 'berlin', 'nước pháp', 'paris', 'nước mỹ', 'hoa kỳ', 'usa',
      'united states', 'nước anh', 'london', 'nhật bản', 'tokyo', 'hàn quốc', 'seoul', 'trung quốc',
      'bắc kinh', 'thái lan', 'bangkok', 'singapore', 'úc', 'australia', 'canada', 'nga', 'moscow',
      'viết code', 'python', 'javascript', 'java', 'c++', 'html', 'giải toán', 'phương trình',
      'đạo hàm', 'tích phân', 'tiền ảo', 'crypto', 'bitcoin', 'chứng khoán quốc tế', 'tổng thống mỹ',
      'chiến tranh thế giới', 'vật lý', 'hóa học'
    ];

    const isExplicitOffTopic = offTopicKeywords.some((kw) => {
      // Avoid false positive if user mentions languages they speak like 'tiếng Anh' or 'tiếng Đức'
      if (userMessage.toLowerCase().includes('nói tiếng') || userMessage.toLowerCase().includes('hướng dẫn viên tiếng')) {
        return false;
      }
      return userMessage.toLowerCase().includes(kw);
    });

    if (isExplicitOffTopic) {
      const offTopicMsg = isVi
        ? `Xin lỗi bạn, tôi là **ViS-AI** - trợ lý chuyên biệt về du lịch, văn hóa và kết nối bạn đồng hành bản địa tại Việt Nam trên nền tảng ViS-Go 🇻🇳.\n\nTôi chỉ có thể hỗ trợ các thông tin về chuyến đi, tour ẩm thực ngõ hẻm, phố cổ, bạn đồng hành địa phương và chính sách bảo vệ ký quỹ 100% trên ViS-Go. Tôi không thể hỗ trợ các câu hỏi ngoài phạm vi du lịch Việt Nam.\n\nBạn có muốn tôi gợi ý các trải nghiệm văn hóa tuyệt vời tại **Hà Nội**, **TP. Hồ Chí Minh**, **Đà Nẵng**, **Hội An** hay **Đà Lạt** không ạ?`
        : `I apologize, but I am **ViS-AI**, dedicated exclusively to authentic Vietnamese local travel, cultural tours, verified local buddies, and ViS-Go platform services in Vietnam 🇻🇳.\n\nI cannot answer inquiries outside of Vietnam tourism and cultural travel. Would you like me to recommend any authentic experiences in **Hanoi**, **Ho Chi Minh City**, **Da Nang**, **Hoi An**, or other parts of Vietnam?`;

      return {
        answer: offTopicMsg,
        sourceTours: [],
        sourceHosts: [],
        actionItems: [
          {
            type: 'city',
            label: isVi ? '🛵 Khám phá Tour Hà Nội' : '🛵 Explore Hanoi Tours',
            payload: 'Hà Nội',
          },
          {
            type: 'city',
            label: isVi ? '🏮 Khám phá Phố cổ Hội An' : '🏮 Explore Hoi An Ancient Town',
            payload: 'Hội An',
          },
          {
            type: 'city',
            label: isVi ? '🍜 Khám phá Ẩm thực Sài Gòn' : '🍜 Explore Saigon Street Food',
            payload: 'TP. Hồ Chí Minh',
          },
        ],
        suggestedFollowups: isVi
          ? [
              'Gợi ý tour ẩm thực phố cổ Hà Nội',
              'Tour Vespa đêm ở Sài Gòn có gì vui?',
              'Chính sách ký quỹ ViS-Go Escrow 100% hoạt động thế nào?',
              'Làm sao để đặt tour với Host bản địa?',
            ]
          : [
              'Recommend street food tours in Hanoi Old Quarter',
              'What makes the Saigon Vespa night tour special?',
              'How does 100% ViS-Go Escrow protection work?',
              'How do I book with a verified local buddy?',
            ],
      };
    }

    // Attempt Server-Side Gemini API Call
    try {
      const response = await fetch('/api/rag-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          context,
          history,
          language,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.text && typeof data.text === 'string' && data.text.trim().length > 0) {
          return {
            answer: data.text,
            sourceTours: topTours,
            sourceHosts: matchedHosts,
            actionItems,
            suggestedFollowups: isVi
              ? [
                  'Tôi muốn xem các tour ẩm thực ngõ hẻm',
                  'Chính sách thanh toán ký quỹ ViS-Go Escrow hoạt động thế nào?',
                  'Có tour nào ở TP. Hồ Chí Minh / Sài Gòn không?',
                  'Làm sao để đăng ký trở thành Host dẫn tour?',
                ]
              : [
                  'Show me authentic street food tours',
                  'How does the 100% ViS-Go Escrow protection work?',
                  'What are the best tours in Hanoi Old Quarter?',
                  'How can I become a verified Local Buddy?',
                ],
          };
        }
      }
    } catch (e) {
      console.warn('Server Gemini API call failed or in dev fallback mode:', e);
    }

    // High-Quality Local RAG Generator Fallback
    const localAnswer = this.generateLocalRagResponse(userMessage, topTours, matchedHosts, isVi);

    return {
      answer: localAnswer,
      sourceTours: topTours,
      sourceHosts: matchedHosts,
      actionItems,
      suggestedFollowups: isVi
        ? [
            'Tôi muốn xem tour xe máy Vespa ở Sài Gòn',
            'Chính sách hủy tour và hoàn tiền ra sao?',
            'Có tour nào phù hợp với gia đình có trẻ em?',
            'Đặt tour và thanh toán qua VietQR thế nào?',
          ]
        : [
            'Tell me about vintage Vespa night tours in Saigon',
            'What is the cancellation and refund policy?',
            'Are there family-friendly tours available?',
            'How do I pay with VietQR or Credit Card?',
          ],
    };
  }

  /**
   * Rich Grounded Local Fallback Engine based on live webapp state
   */
  private static generateLocalRagResponse(
    query: string,
    tours: Tour[],
    hosts: User[],
    isVi: boolean
  ): string {
    const q = query.toLowerCase().trim();

    // 0. Explicit Greetings & Help requests (Xin chào, Tôi cần bạn giúp, Giúp tôi)
    const isGreeting = /^(xin chào|chào|hello|hi|hey|chào bạn|alo|chào buổi sáng|chào buổi tối|hế lô)\b/i.test(q);
    const isHelpRequest = /cần bạn giúp|giúp tôi|hướng dẫn|làm được gì|trợ giúp|bạn là ai|who are you|help me|can you help/i.test(q);

    if (isGreeting || isHelpRequest) {
      if (isVi) {
        return `Dạ xin chào bạn! 👋 Tôi là **ViS-AI** - trợ lý hỗ trợ du lịch và khám phá các trải nghiệm bản địa tại Việt Nam trên ViS-Go.

Tôi có thể hỗ trợ bạn:
1. 🍜 **Gợi ý món ngon & tour ẩm thực**: Phở gánh, bánh mì Hội An, cà phê trứng ngõ cổ, chợ đêm Sài Gòn...
2. 🛵 **Kết nối bạn đồng hành bản địa**: Các Host địa phương am hiểu văn hóa và thông thạo ngoại ngữ.
3. 🗺️ **Tư vấn lịch trình**: Lên kế hoạch khám phá các góc phố ngõ hẻm độc đáo.
4. 📍 **Hỗ trợ điểm hẹn**: Theo dõi vị trí và gặp mặt Host dễ dàng.

Bạn đang quan tâm đến thành phố nào (Hà Nội, TP. Hồ Chí Minh, Đà Nẵng, Hội An, Huế, Sa Pa...) ạ? 🇻🇳`;
      } else {
        return `Hello and welcome! 👋 I am **ViS-AI** - your local travel companion in Vietnam on ViS-Go.

Here is how I can assist your journey:
1. 🍜 **Street food & hidden alleyway gems**: Secret egg coffee spots, heritage food walks in Hanoi, Vespa foodie adventures in Saigon...
2. 🛵 **Connect with friendly local buddies**: Knowledgeable local guides passionate about sharing their culture.
3. 🗺️ **Tailored itineraries**: Recommendations for must-visit spots and cultural walks.
4. 📍 **Meeting points**: Live GPS location assistance to meet up smoothly.

Which city are you exploring (Hanoi, Saigon, Da Nang, Hoi An, Hue, Sapa...), or what experience are you seeking today? 🇻🇳`;
      }
    }

    // 1. Escrow / Safety / Payment queries
    if (/escrow|an toàn|bảo hiểm|hoàn tiền|refund|hủy tour|thanh toán|payment|qr|vietqr/i.test(q)) {
      if (isVi) {
        return `🛡️ **Chính sách An Toàn & Ký Quỹ ViS-Go Escrow (100% An Tâm)**:

1. **Bảo Vệ Tiền Cọc 100%**: Khi bạn đặt tour, số tiền thanh toán (qua VietQR, MoMo, Visa/Mastercard) sẽ được giữ an toàn trong hệ thống ký quỹ **ViS-Go Escrow**. Tiền chỉ được chuyển cho Host sau khi chuyến đi hoàn tất trọn vẹn và bạn hài lòng.
2. **Miễn Phí Hủy Tour**: Bạn được hoàn tiền 100% khi thông báo hủy trước 24 giờ so với giờ khởi hành.
3. **Host Đã Xác Thực eKYC**: 100% người bạn bản địa trên sàn đều đã được kiểm tra căn cước công dân/hộ chiếu, đối chiếu sinh trắc học và kiểm tra lý lịch tư pháp trong sạch.
4. **Radar GPS Trực Tiếp**: Bạn và Host có thể theo dõi vị trí gặp mặt thời gian thực và liên hệ Hotline cứu trợ khẩn cấp 24/7 (**+84 908 123 456**).`;
      } else {
        return `🛡️ **ViS-Go Safety & 100% Escrow Protection Guarantee**:

1. **100% Escrow Money Protection**: When you book a tour, your payment (via VietQR, Card, or MoMo) is securely held by the **ViS-Go Escrow Vault**. Payout is only released to your local buddy after your journey concludes smoothly.
2. **Free 24h Cancellation**: Enjoy 100% full refunds if you cancel at least 24 hours prior to tour departure.
3. **Biometric eKYC Verified Hosts**: Every local companion undergoes national ID/passport biometric verification and criminal background checks.
4. **Live GPS Radar & SOS**: Track your host's location in real-time on our GPS Radar and access our 24/7 traveler support line (**+84 908 123 456**).`;
      }
    }

    // 2. Becoming a Host / Guide
    if (/làm host|đăng ký host|trở thành host|become a host|guide|dẫn tour/i.test(q)) {
      if (isVi) {
        return `🛵 **Trở thành Người Bạn Bản Địa (Local Host Buddy) trên ViS-Go**:

- **Thu nhập hấp dẫn**: Nhận đến 85% giá trị tour trực tiếp vào tài khoản ngân hàng ngay khi tour hoàn thành.
- **Tự do sáng tạo**: Tự thiết kế lịch trình tour độc đáo mang dấu ấn văn hóa riêng của bạn qua **Host Creator Studio**.
- **Quy trình tham gia 3 bước**:
  1. Đăng ký tài khoản chọn vai trò **Host Bản Địa**.
  2. Hoàn tất hồ sơ eKYC (Chụp CCCD/Passport mặt trước, mặt sau & ảnh chân dung).
  3. Đăng tải tour trải nghiệm đầu tiên và đón nhận du khách quốc tế!`;
      } else {
        return `🛵 **Become a Verified Local Buddy on ViS-Go**:

- **Earn Great Income**: Keep 85% of every tour payout deposited directly to your bank account upon tour completion.
- **Full Creative Freedom**: Design unique cultural, culinary, and alleyway itineraries via our **Host Creator Studio**.
- **Quick 3-Step Onboarding**:
  1. Register an account and choose the **Local Host Buddy** role.
  2. Complete quick eKYC verification (Front & back ID/Passport + selfie).
  3. Publish your first signature experience and welcome travelers from around the world!`;
      }
    }

    // 3. Tour recommendations based on retrieved data
    if (tours.length > 0) {
      const top = tours[0];
      const title = isVi ? top.titleVi || top.title : top.title;
      const desc = isVi ? top.descriptionVi || top.description : top.description;
      const priceText = `${top.priceVND.toLocaleString('vi-VN')}₫ (~$${top.priceUSD} USD)`;

      if (isVi) {
        let answer = `✨ Dựa trên yêu cầu của bạn, tôi gợi ý trải nghiệm nổi bật nhất:\n\n`;
        answer += `🌟 **${title}**\n`;
        answer += `📍 **Địa điểm**: ${top.city} | **Thời lượng**: ${top.durationHours} tiếng\n`;
        answer += `💰 **Giá vé**: **${priceText}** / người\n`;
        answer += `👤 **Host bản địa**: **${top.hostName}** (${top.hostRating}★ • ${top.hostReviewCount} đánh giá • ${top.hostVerified ? 'Đã xác thực eKYC' : 'Host mới'})\n`;
        answer += `🗣️ **Ngôn ngữ**: ${(top.hostLanguages || top.languages).join(', ')}\n`;
        answer += `🍜 **Bao gồm**: ${(top.includedVi || top.included).join(', ')}\n\n`;
        answer += `💡 *${desc.slice(0, 180)}...*\n\n`;

        if (tours.length > 1) {
          answer += `👉 **Các lựa chọn hấp dẫn khác**:\n`;
          tours.slice(1).forEach((t, i) => {
            answer += `- **${t.titleVi || t.title}** (${t.city}) - ${t.priceVND.toLocaleString('vi-VN')}₫ (Host: ${t.hostName})\n`;
          });
        }
        answer += `\n*Bạn có thể bấm vào nút bên dưới để xem chi tiết hoặc đặt chỗ ngay cùng người bạn bản địa!*`;
        return answer;
      } else {
        let answer = `✨ Based on your request, here is the top recommended authentic experience:\n\n`;
        answer += `🌟 **${title}**\n`;
        answer += `📍 **Location**: ${top.city} | **Duration**: ${top.durationHours} hours\n`;
        answer += `💰 **Price**: **${priceText}** / person\n`;
        answer += `👤 **Local Buddy**: **${top.hostName}** (${top.hostRating}★ • ${top.hostReviewCount} reviews • ${top.hostVerified ? 'eKYC Verified' : 'Standard'})\n`;
        answer += `🗣️ **Languages**: ${(top.hostLanguages || top.languages).join(', ')}\n`;
        answer += `🍜 **Includes**: ${top.included.join(', ')}\n\n`;
        answer += `💡 *${desc.slice(0, 180)}...*\n\n`;

        if (tours.length > 1) {
          answer += `👉 **Other great options you might love**:\n`;
          tours.slice(1).forEach((t) => {
            answer += `- **${t.title}** (${t.city}) - $${t.priceUSD} USD (~${t.priceVND.toLocaleString('vi-VN')}₫) by ${t.hostName}\n`;
          });
        }
        answer += `\n*Click any action chip below to view full itinerary, route stops, and reserve instantly!*`;
        return answer;
      }
    }

    // Default general greeting
    if (isVi) {
      return `Xin chào! Tôi là **ViS-AI**. Tôi có thể giúp bạn:
- Khám phá tour ẩm thực ngõ hẻm và các điểm đến độc đáo tại Hà Nội, TP. Hồ Chí Minh, Hội An, Đà Nẵng...
- Kết nối với bạn đồng hành (Host) bản địa thân thiện, am hiểu văn hóa.
- Tư vấn lịch trình và giải đáp các thắc mắc về điểm đến tại Việt Nam.

Hãy gửi câu hỏi cho tôi để bắt đầu nhé! 🇻🇳`;
    } else {
      return `Hello! I am **ViS-AI**. I can help you:
- Discover hidden street food spots and authentic walking tours across Hanoi, Saigon, Hoi An, Da Nang, and more.
- Connect with knowledgeable local guides and buddies.
- Plan itineraries and get insider tips for exploring Vietnam.

Feel free to ask me anything to get started! 🇻🇳`;
    }
  }
}
