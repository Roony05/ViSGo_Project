/**
 * The starting dataset for a fresh ViS-Go database.
 *
 * THIS FILE IS NOT PART OF THE APP. Nothing under `src/` may import it, and
 * `npm run build` must never pull it into a bundle. It exists for exactly one
 * consumer: `scripts/seed-firestore.ts`, which runs on your machine and copies
 * these rows into Firestore once. After that, Firestore is the data — the app
 * reads and writes there and never looks here again.
 *
 * That separation is the whole point. These rows carry email addresses, phone
 * numbers, meeting points and identity documents of the demo accounts. While
 * this lived in `src/data/mockData.ts` and was imported by `storage.ts` as an
 * offline fallback, every one of those values was shipped to every visitor and
 * readable with F12 — including the demo passwords, which is how someone would
 * have found their way into the admin account.
 *
 * So: no passwords here either. The seeder takes those from SEED_PASSWORD and
 * SEED_ADMIN_PASSWORD in `.env`, which has no VITE_ prefix and therefore cannot
 * reach the browser. Editing a row here changes nothing until you re-run
 * `npm run seed`.
 */

import { Tour, User, Booking, HostKycApplication, LocalVideo, TourReview } from '../src/types';

export const INITIAL_USERS: User[] = [
  {
    id: 'user_cust_1',
    name: 'Sarah Jenkins',
    email: 'customer@visgo.vn',
    role: 'customer',
    phone: '+84 901 234 567',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    bio: 'Passionate travel photographer exploring Southeast Asian street food and culture.',
    bioVi: 'Nhiếp ảnh gia du lịch đam mê khám phá ẩm thực đường phố và văn hóa Đông Nam Á.',
    tagline: 'Wandering the streets of Hanoi in search of authentic flavors.',
    taglineVi: 'Khám phá từng con phố Hà Nội để tìm kiếm hương vị chân thực nhất.',
    languages: ['English', 'French'],
    specialties: ['Photography', 'Street Food'],
    city: 'Hà Nội',
    verified: true,
  },
  {
    id: 'user_host_1',
    name: 'Nguyễn Minh Tuấn (Tommy)',
    email: 'host@visgo.vn',
    role: 'host',
    phone: '+84 912 345 678',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    bio: 'Born and raised in the heart of Hanoi Old Quarter. With over 7 years of guiding foreign travelers on vintage scooters, I love sharing family-owned street food alleys, secret egg coffee rooftops, and untold wartime architectural stories.',
    bioVi: 'Sinh ra và lớn lên giữa lòng 36 phố phường Hà Nội. Với hơn 7 năm kinh nghiệm đồng hành cùng du khách quốc tế trên xe máy cổ, mình mong muốn chia sẻ những quán ăn gia truyền ẩn mình trong ngõ hẹp, quán cà phê trứng bí mật và những câu chuyện lịch sử ngàn năm.',
    tagline: 'Hanoi native, vintage Vespa lover & street food storyteller.',
    taglineVi: 'Chàng trai Hà Nội, đam mê xe Vespa cổ & kể chuyện ẩm thực ngõ hẻm.',
    languages: ['Tiếng Việt', 'English', 'Français'],
    specialties: ['Street Food', 'Vintage Vespa', 'Hidden Rooftops', 'Old Quarter History'],
    city: 'Hà Nội',
    verified: true,
    rating: 4.98,
    reviewCount: 142,
    totalEarnings: 38500000,
    completedTours: 78,
    isAcceptingGuests: true,
    currentLat: 21.0335,
    currentLng: 105.8505,
  },
  {
    id: 'user_host_2',
    name: 'Trần Thị Mai Linh',
    email: 'linh.host@visgo.vn',
    role: 'host',
    phone: '+84 933 456 789',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    bio: 'Food blogger and cultural storyteller born and raised in District 5 (Saigon Chinatown). Passionate about Cantonese dim sum heritage, Southern coffee culture, and nighttime scooter adventures.',
    bioVi: 'Blogger ẩm thực và người kể chuyện văn hóa lớn lên tại Quận 5 (Chợ Lớn Sài Gòn). Say mê di sản dim sum truyền thống, văn hóa cà phê vợt và những chuyến lướt xe máy ngắm Sài Gòn về đêm.',
    tagline: 'Saigon Chinatown insider & night food explorer.',
    taglineVi: 'Thổ địa Chợ Lớn & người dẫn lối ẩm thực đêm Sài Gòn.',
    languages: ['Tiếng Việt', 'English', 'Mandarin (中文)'],
    specialties: ['Saigon Street Food', 'Chinatown Heritage', 'Night Markets'],
    city: 'TP. Hồ Chí Minh',
    verified: true,
    rating: 4.95,
    reviewCount: 96,
    totalEarnings: 29400000,
    completedTours: 54,
    isAcceptingGuests: true,
    currentLat: 10.7554,
    currentLng: 106.6653,
  },
  {
    id: 'user_host_3',
    name: 'Lê Văn Hoàng',
    email: 'hoang.host@visgo.vn',
    role: 'host',
    phone: '+84 905 112 233',
    // No photograph, deliberately. The four hosts below used to be names on a
    // tour with no account behind them, and the stock portraits the catalogue
    // gave them were photographs of real strangers standing in as identities.
    // <Avatar> draws initials instead; each of these accounts can upload a real
    // picture by signing in.
    avatar: '',
    bio: 'Da Nang fisherman\u2019s son turned coastal guide. I know which boats land at which hour, which stretch of Son Tra the monkeys come down to at dusk, and where the Dragon Bridge is best watched from.',
    bioVi: 'Con trai một gia đình ngư dân Đà Nẵng, giờ dẫn tour ven biển. Mình biết thuyền nào cập bến giờ nào, đoạn nào ở Sơn Trà đàn voọc hay xuống lúc chiều muộn, và chỗ ngắm Cầu Rồng phun lửa đẹp nhất.',
    tagline: 'Coastal Da Nang, from the fish market to the Son Tra ridge.',
    taglineVi: 'Đà Nẵng ven biển, từ chợ cá tới đỉnh Sơn Trà.',
    languages: ['Tiếng Việt', 'English'],
    specialties: ['Seafood', 'Son Tra Peninsula', 'Dragon Bridge'],
    city: 'Đà Nẵng',
    verified: true,
    rating: 4.97,
    reviewCount: 88,
    totalEarnings: 21600000,
    completedTours: 46,
    isAcceptingGuests: true,
    currentLat: 16.0678,
    currentLng: 108.2208,
  },
  {
    id: 'user_host_4',
    name: 'Võ Minh Châu',
    email: 'chau.host@visgo.vn',
    role: 'host',
    phone: '+84 905 889 900',
    avatar: '',
    bio: 'Third-generation silk lantern maker in Hoi An. My grandmother taught me the bamboo frame; I will teach you in an afternoon, and we eat a herb-garden vegetarian meal after.',
    bioVi: 'Đời thứ ba làm đèn lồng lụa ở Hội An. Bà ngoại dạy mình cách vót khung tre; mình sẽ chỉ lại cho bạn trong một buổi chiều, xong cùng ăn cơm chay bên vườn thảo mộc.',
    tagline: 'Hoi An lantern workshop, and a quiet herb-garden meal.',
    taglineVi: 'Xưởng đèn lồng Hội An và bữa cơm chay bên vườn thảo mộc.',
    languages: ['Tiếng Việt', 'English'],
    specialties: ['Silk Lanterns', 'Craft Workshops', 'Vegetarian Cooking'],
    city: 'Hội An',
    verified: true,
    rating: 4.99,
    reviewCount: 110,
    totalEarnings: 26900000,
    completedTours: 58,
    isAcceptingGuests: true,
    currentLat: 15.8801,
    currentLng: 108.3380,
  },
  {
    id: 'user_host_5',
    name: 'Đặng Quốc Bảo',
    email: 'bao.host@visgo.vn',
    role: 'host',
    phone: '+84 963 221 144',
    avatar: '',
    bio: 'I grew up between the pine hills and the greenhouses of Da Lat. Coffee farms in the morning, waterfalls nobody queues for in the afternoon, and the cold you did not pack for.',
    bioVi: 'Mình lớn lên giữa đồi thông và nhà kính Đà Lạt. Sáng đi vườn cà phê, chiều tới thác không phải xếp hàng, và cái lạnh mà bạn chắc chắn quên mang áo.',
    tagline: 'Da Lat pine hills, coffee farms and quiet waterfalls.',
    taglineVi: 'Đồi thông Đà Lạt, vườn cà phê và những con thác vắng người.',
    languages: ['Tiếng Việt', 'English'],
    specialties: ['Coffee Farms', 'Waterfalls', 'Nature Trek'],
    city: 'Đà Lạt',
    verified: true,
    rating: 4.96,
    reviewCount: 75,
    totalEarnings: 18300000,
    completedTours: 39,
    isAcceptingGuests: true,
    currentLat: 11.9404,
    currentLng: 108.4583,
  },
  {
    id: 'user_host_6',
    name: 'Nguyễn Phước Bảo Trí',
    email: 'tri.host@visgo.vn',
    role: 'host',
    phone: '+84 914 556 789',
    avatar: '',
    bio: 'Hue born, and descended from the Nguyen line the city is named for. Royal cuisine, the citadel at the hours nobody visits, and a boat on the Perfume River at dusk.',
    bioVi: 'Sinh ra ở Huế, thuộc dòng Nguyễn Phước. Ẩm thực cung đình, Đại Nội vào những giờ không ai ghé, và một chuyến đò trên sông Hương lúc chiều buông.',
    tagline: 'Hue royal cuisine and the citadel when it is empty.',
    taglineVi: 'Ẩm thực cung đình Huế và Đại Nội lúc vắng người.',
    languages: ['Tiếng Việt', 'English'],
    specialties: ['Royal Cuisine', 'Imperial Citadel', 'Perfume River'],
    city: 'Huế',
    // Not verified yet: this host's identity declaration is still in the admin
    // queue, which is what keeps that screen showing a real pending case.
    verified: false,
    rating: 4.98,
    reviewCount: 64,
    totalEarnings: 15200000,
    completedTours: 31,
    isAcceptingGuests: true,
    currentLat: 16.4637,
    currentLng: 107.5909,
  },
  {
    id: 'user_admin_1',
    name: 'ViS-Go Operations Center',
    email: 'admin@visgo.vn',
    role: 'admin',
    phone: '+84 24 3999 8888',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
    bio: 'Platform Trust & Safety Administrator with 24/7 host verification and guest support.',
    bioVi: 'Trung tâm Vận hành An toàn & Xác minh Danh tính ViS-Go 24/7.',
    languages: ['Tiếng Việt', 'English'],
    city: 'Hà Nội',
    verified: true,
  }
];

export const INITIAL_TOURS: Tour[] = [
  {
    id: 'tour_hn_01',
    hostId: 'user_host_1',
    hostName: 'Nguyễn Minh Tuấn (Tommy)',
    hostAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    hostPhone: '+84 912 345 678',
    hostRating: 4.98,
    hostReviewCount: 142,
    hostVerified: true,
    hostBio: 'Born and raised in the heart of Hanoi Old Quarter. With over 7 years of guiding foreign travelers on vintage scooters, I love sharing family-owned street food alleys, secret egg coffee rooftops, and untold wartime architectural stories.',
    hostBioVi: 'Sinh ra và lớn lên giữa lòng 36 phố phường Hà Nội. Với hơn 7 năm kinh nghiệm đồng hành cùng du khách quốc tế trên xe máy cổ, mình mong muốn chia sẻ những quán ăn gia truyền ẩn mình trong ngõ hẹp, quán cà phê trứng bí mật và những câu chuyện lịch sử ngàn năm.',
    hostLanguages: ['Tiếng Việt', 'English', 'Français'],
    hostSpecialties: ['Street Food', 'Vintage Vespa', 'Hidden Rooftops'],
    title: 'Hanoi Secret Alleys, Vintage Scooter & Midnight Pho Safari',
    titleVi: 'Hà Nội Ngõ Hẻm Bí Mật, Xe Máy Cổ & Săn Phở Đêm',
    tagline: 'Ride through 1,000-year-old French quarters and taste secret family recipes.',
    taglineVi: 'Lướt xe máy qua những con ngõ trăm năm và thưởng thức món phở gia truyền bí mật.',
    city: 'Hà Nội',
    category: 'street-food',
    durationHours: 3.5,
    priceVND: 650000,
    priceUSD: 26,
    maxGroupSize: 4,
    languages: ['English', 'Tiếng Việt'],
    meetingPoint: 'Hanoi Opera House (Nhà Hát Lớn Hà Nội), 1 Tràng Tiền',
    meetingPointVi: 'Nhà Hát Lớn Hà Nội, 1 Tràng Tiền, Hoàn Kiếm',
    lat: 21.0245,
    lng: 105.8576,
    coverImage: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&auto=format&fit=crop&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1528127269322-539801943592?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&auto=format&fit=crop&q=80'
    ],
    included: [
      'Vintage scooter ride with safe licensed driver',
      '5 authentic food stops (Pho, Bun Cha, Banh Cuon, Egg Coffee, Che)',
      'Bottled mineral water & wet wipes',
      'Quality safety helmet & rain poncho'
    ],
    includedVi: [
      'Xe máy cổ điển cùng tài xế bản địa tay lái vững vàng',
      '5 điểm dừng ăn uống bản địa (Phở, Bún chả, Bánh cuốn, Cà phê trứng, Chè)',
      'Nước khoáng đóng chai & khăn lạnh',
      'Mũ bảo hiểm đạt chuẩn an toàn & áo mưa tiện lợi'
    ],
    stops: [
      {
        id: 'stop_1',
        time: '18:00',
        title: 'Meetup & Secret French Alley Walk',
        titleVi: 'Hẹn gặp & Đi bộ khám phá ngõ cổ thời Pháp',
        description: 'Gather at the Opera House, hop on scooters, and enter the narrow 1920s French-built residential tunnels.',
        descriptionVi: 'Tập trung tại Nhà Hát Lớn, lên xe máy và khám phá hệ thống ngõ hẹp kiểu Pháp từ thập niên 1920.',
        locationName: 'Tràng Tiền & Phan Chu Trinh',
        lat: 21.0245,
        lng: 105.8576
      },
      {
        id: 'stop_2',
        time: '18:45',
        title: 'Steamy Wood-Fired Bún Chả',
        titleVi: 'Bún chả nướng than hoa gia truyền',
        description: 'Savor charcoal-grilled pork patties in sweet savory fish sauce broth with fresh perilla and herbs.',
        descriptionVi: 'Thưởng thức bún chả nướng than hoa thơm lừng với nước mắm chua ngọt và rau thơm tươi sạch.',
        locationName: 'Ngõ Hàng Buồm',
        lat: 21.0355,
        lng: 105.8512
      },
      {
        id: 'stop_3',
        time: '19:45',
        title: 'Authentic 1946 Recipe Egg Coffee (Cà Phê Trứng)',
        titleVi: 'Cà phê Trứng nguyên bản từ năm 1946',
        description: 'Learn how egg yolks are whipped with honey and condensed milk over rich robusta drip coffee.',
        descriptionVi: 'Tìm hiểu câu chuyện ra đời của món cà phê trứng béo ngậy được đánh bông cùng mật ong và sữa đặc.',
        locationName: 'Café Giảng, Nguyễn Hữu Huân',
        lat: 21.0332,
        lng: 105.8543
      },
      {
        id: 'stop_4',
        time: '20:45',
        title: 'Long Biên Bridge Breeze & Night Train Passing',
        titleVi: 'Hóng gió Cầu Long Biên & Ngắm tàu đêm',
        description: 'Stand on the historic Eiffel-designed bridge spanning the Red River and watch the midnight locomotive pass.',
        descriptionVi: 'Dạo bước trên cây cầu thép trăm tuổi bắc qua Sông Hồng và ngắm nhìn đoàn tàu đêm rực sáng.',
        locationName: 'Cầu Long Biên',
        lat: 21.0428,
        lng: 105.8589
      }
    ],
    description: 'Avoid commercial tourist restaurants and discover how true Hanoians eat, drink, and socialize. Led by Tommy, a lifelong Old Quarter resident, you will explore secret communal courtyard eateries, sample legendary heirloom dishes, and glide comfortably through quiet illuminated French boulevards on a classic motorbike.',
    descriptionVi: 'Tạm gác lại những nhà hàng du lịch thông thường để hòa mình vào nhịp sống ẩm thực đêm của người Hà Nội. Cùng Tommy - một người con phố cổ, len lỏi qua từng con ngõ nhỏ, thưởng thức các món ăn gia truyền nức tiếng và lướt gió qua những đại lộ Pháp rợp bóng cây.',
    featured: true,
    createdAt: '2026-05-10',
    status: 'active'
  },
  {
    id: 'tour_sg_02',
    hostId: 'user_host_2',
    hostName: 'Trần Thị Mai Linh',
    hostAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    hostPhone: '+84 933 456 789',
    hostRating: 4.95,
    hostReviewCount: 96,
    hostVerified: true,
    hostBio: 'Food blogger and cultural storyteller born and raised in District 5 (Saigon Chinatown). Passionate about Cantonese dim sum heritage, Southern coffee culture, and nighttime scooter adventures.',
    hostBioVi: 'Blogger ẩm thực và người kể chuyện văn hóa lớn lên tại Quận 5 (Chợ Lớn Sài Gòn). Say mê di sản dim sum truyền thống, văn hóa cà phê vợt và những chuyến lướt xe máy ngắm Sài Gòn về đêm.',
    hostLanguages: ['Tiếng Việt', 'English', 'Mandarin (中文)'],
    hostSpecialties: ['Saigon Street Food', 'Chinatown Heritage', 'Night Markets'],
    title: 'Saigon Chinatown (Chợ Lớn) Heritage, Taoist Temples & Secret Dim Sum',
    titleVi: 'Sài Gòn Chợ Lớn: Di Sản Người Hoa, Chùa Cổ & Dim Sum Hẻm',
    tagline: 'Step into the 1930s cinematic atmosphere of District 5 with herbal apothecaries and incense coils.',
    taglineVi: 'Lạc bước vào không gian điện ảnh Hồng Kông thập niên 30 giữa lòng Quận 5 cùng phố thuốc bắc và đền chùa cổ.',
    city: 'TP. Hồ Chí Minh',
    category: 'heritage',
    durationHours: 4,
    priceVND: 590000,
    priceUSD: 24,
    maxGroupSize: 6,
    languages: ['English', 'Tiếng Việt', 'Mandarin'],
    meetingPoint: 'Cha Tam Church (Nhà thờ Cha Tam), 25 Học Lạc, District 5',
    meetingPointVi: 'Nhà thờ Cha Tam, 25 Học Lạc, Phường 14, Quận 5',
    lat: 10.7518,
    lng: 106.6575,
    coverImage: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800&auto=format&fit=crop&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1569154941061-e231b4725ef1?w=800&auto=format&fit=crop&q=80'
    ],
    included: [
      'Professional host & fluent multilingual storyteller',
      'Dim sum feast & traditional Chinese dessert (Chè mè đen)',
      'Herbal tea tasting at an 80-year-old apothecary',
      'All temple entry & incense offerings'
    ],
    includedVi: [
      'Host bản địa người Hoa thông thạo đa ngôn ngữ',
      'Bữa tiệc Dim sum & chè mè đen gia truyền',
      'Thưởng trà thảo mộc tại tiệm thuốc bắc 80 năm tuổi',
      'Vé vào cổng và nhang vòng ước nguyện tại các hội quán'
    ],
    stops: [
      {
        id: 'sg_stop_1',
        time: '08:30',
        title: 'Cha Tam Baroque Church & Historic Revolution Story',
        titleVi: 'Nhà thờ Cha Tam & Những dấu ấn lịch sử',
        description: 'Explore the fusion of Gothic architecture and Chinese pagoda carvings.',
        descriptionVi: 'Khám phá sự giao thoa độc đáo giữa kiến trúc Gothic phương Tây và mái ngói chùa Hoa.',
        locationName: 'Nhà thờ Cha Tam',
        lat: 10.7518,
        lng: 106.6575
      },
      {
        id: 'sg_stop_2',
        time: '09:30',
        title: 'Ba Thien Hau Pagoda (Chùa Bà Thiên Hậu)',
        titleVi: 'Hội quán Tuệ Thành (Chùa Bà Thiên Hậu)',
        description: 'Marvel at 19th-century ceramic roof dioramas and hang your aromatic incense coil with personal wishes.',
        descriptionVi: 'Chiêm ngưỡng phù điêu gốm thế kỷ 19 và treo nhang vòng gửi gắm lời cầu chúc bình an.',
        locationName: 'Chùa Bà Thiên Hậu, Nguyễn Trãi',
        lat: 10.7538,
        lng: 106.6601
      },
      {
        id: 'sg_stop_3',
        time: '10:45',
        title: 'Hidden Laneway Dim Sum & Roast Duck Feast',
        titleVi: 'Thưởng thức Dim Sum & Vịt quay hẻm bí truyền',
        description: 'Fresh steamed Har Gow dumplings, crispy Char Siu buns, and roasted duck skin at a family table.',
        descriptionVi: 'Thưởng thức há cảo tôm tươi hấp xửng tre, bánh bao xá xíu giòn rụm và vịt quay giòn da.',
        locationName: 'Hẻm Hào Sĩ Phường',
        lat: 10.7525,
        lng: 106.6628
      }
    ],
    description: 'Chợ Lớn is one of the oldest Chinatowns in the world with a vibrant cultural heartbeat. Mai Linh guides you into peaceful inner temple courtyards, aromatic herbal lanes of Hải Thượng Lãn Ông, and secret alleyways that feel frozen in time.',
    descriptionVi: 'Chợ Lớn là một trong những khu phố người Hoa lâu đời nhất thế giới với nhịp sống giàu bản sắc. Mai Linh sẽ đưa bạn vào những gian thờ cổ kính trầm mặc, con phố đông y nồng nàn thảo mộc và những hẻm chung cư rực rỡ sắc màu.',
    featured: true,
    createdAt: '2026-06-01',
    status: 'active'
  },
  {
    id: 'tour_dn_03',
    hostId: 'user_host_3',
    hostName: 'Lê Văn Hoàng',
    hostAvatar: '',
    hostPhone: '+84 905 112 233',
    hostRating: 4.97,
    hostReviewCount: 88,
    hostVerified: true,
    title: 'Da Nang Dragon Fire Show, Son Tra Sunset & Fishermen Seafood Feast',
    titleVi: 'Đà Nẵng: Cầu Rồng Phun Lửa, Hoàng Hôn Bán Đảo Sơn Trà & Tiệc Hải Sản Làng Chài',
    tagline: 'Catch coastal breeze, watch monkeys at sunset, and dine on freshly landed seafood.',
    taglineVi: 'Đón gió biển Mỹ Khê, ngắm hoàng hôn bán đảo Sơn Trà và thưởng thức hải sản tươi sống vừa cập bến.',
    city: 'Đà Nẵng',
    category: 'nightlife',
    durationHours: 4,
    priceVND: 550000,
    priceUSD: 22,
    maxGroupSize: 8,
    languages: ['English', 'Tiếng Việt'],
    meetingPoint: 'Dragon Bridge Tail (Đuôi Cầu Rồng), 2 Tháng 9 Street',
    meetingPointVi: 'Khu vực Đuôi Cầu Rồng, Đường 2 Tháng 9, Hải Châu',
    lat: 16.0601,
    lng: 108.2208,
    coverImage: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=800&auto=format&fit=crop&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=800&auto=format&fit=crop&q=80'
    ],
    included: [
      'Local buddy guide & transport',
      'Fresh seafood dinner (Grilled squid, tamarind snails, scallops with scallion oil)',
      'Local craft beer or fresh coconut',
      'Prime viewing spot for Dragon Bridge Fire & Water breath show'
    ],
    includedVi: [
      'Host bản địa hướng dẫn & xe đưa đón',
      'Bữa tối hải sản tươi ngon (Mực nướng sa tế, ốc hương xào me, sò điệp mỡ hành)',
      'Bia thủ công Đà Nẵng hoặc dừa tươi ướp lạnh',
      'Vị trí đẹp nhất xem Cầu Rồng phun lửa và nước'
    ],
    stops: [
      {
        id: 'dn_stop_1',
        time: '16:30',
        title: 'Son Tra Peninsula & Wild Douc Langur Spotting',
        titleVi: 'Bán đảo Sơn Trà & Ngắm Voọc chà vá chân nâu',
        description: 'Drive along panoramic coastal curves and look for rare red-shanked douc langurs.',
        descriptionVi: 'Chạy xe quanh cung đường biển ngoạn mục và ngắm nhìn đàn voọc chà vá chân nâu quý hiếm.',
        locationName: 'Bán đảo Sơn Trà',
        lat: 16.1154,
        lng: 108.2736
      },
      {
        id: 'dn_stop_2',
        time: '18:15',
        title: 'Fishermen Beach Shack Seafood Grill',
        titleVi: 'Thưởng thức hải sản quán cóc ven biển',
        description: 'Choose your own live crabs, squid, and clams cooked right over hot charcoal on the sand.',
        descriptionVi: 'Tự tay chọn mực sống, nghêu sò và nướng than hoa thơm phức ngay bên bờ cát.',
        locationName: 'Biển Mân Thái',
        lat: 16.0825,
        lng: 108.2458
      },
      {
        id: 'dn_stop_3',
        time: '20:30',
        title: 'Dragon Bridge Spectacular Fire & Water Show',
        titleVi: 'Mãn nhãn màn Phun Lửa & Phun Nước Cầu Rồng',
        description: 'Witness the iconic 666-meter dragon breathe fiery blasts and refreshing mist.',
        descriptionVi: 'Chứng kiến linh vật rồng thép 666m phun ra những cột lửa uy mãnh và dòng nước mát lành.',
        locationName: 'Cầu Rồng Đà Nẵng',
        lat: 16.0601,
        lng: 108.2208
      }
    ],
    description: 'Experience Da Nang through the eyes of a local coastal buddy. From hidden sunset cliffs where wild monkeys roam to energetic seafood markets and the world-famous weekend dragon show.',
    descriptionVi: 'Trải nghiệm thành phố biển Đà Nẵng qua lăng kính của người dân xứ biển. Từ những mỏm đá ngắm hoàng hôn Sơn Trà đến chợ hải sản nhộn nhịp và màn trình diễn Cầu Rồng độc nhất vô nhị.',
    featured: true,
    createdAt: '2026-06-15',
    status: 'active'
  },
  {
    id: 'tour_ha_04',
    hostId: 'user_host_4',
    hostName: 'Võ Minh Châu',
    hostAvatar: '',
    hostPhone: '+84 905 889 900',
    hostRating: 4.99,
    hostReviewCount: 110,
    hostVerified: true,
    title: 'Hoi An Silk Lantern Crafting, Secret Herbal Garden & Vegan Banquet',
    titleVi: 'Hội An: Làm Đèn Lồng Lụa, Vườn Thảo Mộc & Tiệc Chay Bí Mật',
    tagline: 'Create your own silk lantern with an artisan family and dine beside organic paddy fields.',
    taglineVi: 'Tự tay làm đèn lồng lụa cùng nghệ nhân và thưởng thức bữa tiệc chay bên cánh đồng lúa xanh ngát.',
    city: 'Hội An',
    category: 'craft-art',
    durationHours: 3.5,
    priceVND: 490000,
    priceUSD: 20,
    maxGroupSize: 6,
    languages: ['English', 'Tiếng Việt'],
    meetingPoint: 'Chùa Cầu (Japanese Covered Bridge), Nguyễn Thị Minh Khai',
    meetingPointVi: 'Chùa Cầu, Đường Nguyễn Thị Minh Khai, Phường Minh An',
    lat: 15.8771,
    lng: 108.3259,
    coverImage: 'https://images.unsplash.com/photo-1528127269322-539801943592?w=800&auto=format&fit=crop&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1528127269322-539801943592?w=800&auto=format&fit=crop&q=80'
    ],
    included: [
      'Complete bamboo & Vietnamese silk lantern to take home',
      'Hands-on workshop with a 3rd-generation artisan',
      'Organic 5-course garden vegan dinner',
      'Herbal welcome tea (Trà Mót)'
    ],
    includedVi: [
      'Đèn lồng tre bọc lụa tự tay làm mang về làm kỷ niệm',
      'Buổi hướng dẫn trực tiếp từ nghệ nhân đời thứ 3',
      'Bữa tối chay 5 món hữu cơ giữa vườn lúa',
      'Trà thảo mộc Mót Hội An thanh mát'
    ],
    stops: [
      {
        id: 'ha_stop_1',
        time: '15:30',
        title: 'Ancient Town Heritage Walk & Herbal Tea',
        titleVi: 'Dạo phố cổ & Thưởng trà thảo mộc Mót',
        description: 'Stroll through yellow-walled shophouses and sip lotus infused herbal tea.',
        descriptionVi: 'Dạo bước qua những ngôi nhà cổ tường vàng hoa giấy và thưởng thức ly trà Mót sen thơm.',
        locationName: 'Trần Phú & Bạch Đằng',
        lat: 15.8771,
        lng: 108.3259
      },
      {
        id: 'ha_stop_2',
        time: '16:30',
        title: 'Masterclass Silk Lantern Workshop',
        titleVi: 'Xưởng làm Đèn Lồng Lụa Nghệ Nhân',
        description: 'Bend bamboo spokes, stretch shimmering Ha Dong silk, and fold your portable lantern.',
        descriptionVi: 'Uốn nan tre, dán lụa Hà Đông óng ả và hoàn thiện chiếc đèn lồng xếp gọn xinh xắn.',
        locationName: 'Làng nghề lồng đèn Cẩm Châu',
        lat: 15.8821,
        lng: 108.3412
      },
      {
        id: 'ha_stop_3',
        time: '18:15',
        title: 'Candlelit Vegan Feast by the Rice Fields',
        titleVi: 'Bữa tiệc chay ấm cúng bên cánh đồng lúa',
        description: 'Taste banana flower salad, braised jackfruit, and crispy Hoi An rice pancakes.',
        descriptionVi: 'Thưởng thức nộm hoa chuối, mít non kho nghệ và bánh xèo giòn rụm bên ánh nến lung linh.',
        locationName: 'An Mỹ Organic Farm',
        lat: 15.8905,
        lng: 108.3501
      }
    ],
    description: 'Immerse in the timeless artisanal craftsmanship of Hoi An. Spend an unforgettable afternoon creating your own authentic Vietnamese silk lantern alongside master craftsmen, followed by a serene dinner amidst green paddy fields.',
    descriptionVi: 'Đắm mình trong nét đẹp thủ công mỹ nghệ ngàn đời của phố Hội. Tự tay làm nên tác phẩm đèn lồng lụa độc bản và thưởng thức ẩm thực xanh thư thái giữa thiên nhiên thanh bình.',
    featured: true,
    createdAt: '2026-07-01',
    status: 'active'
  },
  {
    id: 'tour_dl_05',
    hostId: 'user_host_5',
    hostName: 'Đặng Quốc Bảo',
    hostAvatar: '',
    hostPhone: '+84 963 221 144',
    hostRating: 4.96,
    hostReviewCount: 75,
    hostVerified: true,
    title: 'Da Lat Misty Pine Forest Trek & Single-Origin Arabica Farm',
    titleVi: 'Đà Lạt: Trekking Rừng Thông Sương Mù & Nông Trại Cà Phê Arabica Cầu Đất',
    tagline: 'Breathe crisp highland pine air, pick red ripe coffee cherries, and brew over open campfires.',
    taglineVi: 'Hít căng lồng ngực không khí cao nguyên, hái quả cà phê chín mọng và tự pha chế bên bếp lửa hồng.',
    city: 'Đà Lạt',
    category: 'nature-trek',
    durationHours: 5,
    priceVND: 620000,
    priceUSD: 25,
    maxGroupSize: 6,
    languages: ['English', 'Tiếng Việt'],
    meetingPoint: 'Da Lat Railway Station (Ga Đà Lạt), 1 Quang Trung',
    meetingPointVi: 'Ga Đà Lạt, 1 Quang Trung, Phường 9',
    lat: 11.9416,
    lng: 108.4583,
    coverImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80'
    ],
    included: [
      'Guided pine ridge trek with trekking poles',
      'Specialty coffee brewing workshop (V60 & French Press)',
      'Highland BBQ lunch (Grilled sweet potatoes, corn, mountain pork)',
      '1 bag of freshly roasted Cau Dat Arabica beans'
    ],
    includedVi: [
      'Dẫn đường trekking đồi thông kèm gậy leo núi',
      'Workshop thử nếm và pha chế specialty coffee',
      'Bữa trưa BBQ cao nguyên (Khoai lang mật, bắp nướng, thịt xiên nướng than)',
      '1 túi cà phê Arabica Cầu Đất rang mộc thượng hạng'
    ],
    stops: [
      {
        id: 'dl_stop_1',
        time: '07:30',
        title: 'Morning Cloud Hunting & Pine Forest Trailhead',
        titleVi: 'Săn mây sớm & Bắt đầu đường mòn đồi thông',
        description: 'Watch the morning sea of clouds roll over the valleys at 1,500m elevation.',
        descriptionVi: 'Ngắm biển mây bồng bềnh trôi qua thung lũng từ độ cao 1.500m so với mực nước biển.',
        locationName: 'Đồi Đa Phú',
        lat: 11.9685,
        lng: 108.4112
      },
      {
        id: 'dl_stop_2',
        time: '09:30',
        title: 'Artisan Coffee Farm & Cherry Harvesting',
        titleVi: 'Nông trại Arabica Cầu Đất & Thu hoạch quả chín',
        description: 'Walk through lush heirloom Typica and Bourbon coffee bushes and learn fermentation.',
        descriptionVi: 'Dạo quanh vườn cây Typica & Bourbon cổ thụ và khám phá quy trình lên men mật ong.',
        locationName: 'Cầu Đất Farm',
        lat: 11.9054,
        lng: 108.5621
      },
      {
        id: 'dl_stop_3',
        time: '11:30',
        title: 'Campfire Brew & Mountain Roasted Lunch',
        titleVi: 'Bếp lửa pha cà phê & Tiệc nướng ngoài trời',
        description: 'Brew freshly roasted coffee on camping stoves accompanied by sizzling highland treats.',
        descriptionVi: 'Tự tay xay và pha cà phê bằng bếp dã ngoại cùng các món nướng thơm lừng bên suối.',
        locationName: 'Khu rừng thông nguyên sinh',
        lat: 11.9125,
        lng: 108.5501
      }
    ],
    description: 'Escape the crowded tourist spots and step into the poetic pine forests of Da Lat. Taste world-class specialty coffee grown right on Vietnam’s volcanic highland soil and connect deeply with nature.',
    descriptionVi: 'Rời xa phố thị ồn ào để tìm về sự tĩnh lặng giữa rừng thông bạt ngàn Đà Lạt. Thưởng thức hương vị cà phê specialty hảo hạng và tái tạo năng lượng giữa thiên nhiên hoang sơ.',
    featured: false,
    createdAt: '2026-07-10',
    status: 'active'
  },
  {
    id: 'tour_hue_06',
    hostId: 'user_host_6',
    hostName: 'Nguyễn Phước Bảo Trí',
    hostAvatar: '',
    hostPhone: '+84 914 556 789',
    hostRating: 4.98,
    hostReviewCount: 64,
    hostVerified: false,
    title: 'Hue Imperial Citadel Secrets & Royal Court Culinary Masterclass',
    titleVi: 'Huế: Bí Ẩn Đại Nội Hoàng Thành & Nghệ Thuật Ẩm Thực Cung Đình',
    tagline: 'Discover imperial palace intrigues and dine inside a royal descendant garden house.',
    taglineVi: 'Khám phá thâm cung bí sử triều Nguyễn và dùng bữa tại nhà vườn của hậu duệ hoàng tộc.',
    city: 'Huế',
    category: 'heritage',
    durationHours: 4,
    priceVND: 580000,
    priceUSD: 23,
    maxGroupSize: 6,
    languages: ['English', 'Tiếng Việt', 'French'],
    meetingPoint: 'Ngo Mon Gate (Cửa Ngọ Môn), Imperial City Hue',
    meetingPointVi: 'Cửa Ngọ Môn, Đại Nội Huế, Đường 23 Tháng 8',
    lat: 16.4695,
    lng: 107.5794,
    coverImage: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=800&auto=format&fit=crop&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=800&auto=format&fit=crop&q=80'
    ],
    included: [
      'Royal garden house entry & host storytelling',
      '7-course royal feast (Bánh bèo, nậm, lọc, Cơm âm phủ, Chè hạt sen)',
      'Traditional imperial lotus tea & ginger jam',
      'Historical palace photo souvenir'
    ],
    includedVi: [
      'Tham quan nhà vườn quý tộc & nghe kể chuyện hoàng gia',
      'Đại tiệc 7 món cung đình (Bánh bèo, nậm, lọc, Cơm âm phủ, Chè hạt sen long nhãn)',
      'Trà sen cung đình ướp hoa tươi & mứt gừng cay nồng',
      'Tặng ảnh lưu niệm trang phục truyền thống'
    ],
    stops: [
      {
        id: 'hue_stop_1',
        time: '08:30',
        title: 'Ngo Mon & The Forbidden Purple City Lore',
        titleVi: 'Cửa Ngọ Môn & Bí ẩn Tử Cấm Thành Huế',
        description: 'Hear untold stories of Nguyen emperors, royal concubines, and palace ceremonies.',
        descriptionVi: 'Lắng nghe những câu chuyện chưa từng kể về các vị vua triều Nguyễn và điển lễ cung đình.',
        locationName: 'Đại Nội Huế',
        lat: 16.4695,
        lng: 107.5794
      },
      {
        id: 'hue_stop_2',
        time: '10:30',
        title: 'Kim Long Heritage Garden House',
        titleVi: 'Nhà vườn cổ Kim Long của hậu duệ Hoàng tộc',
        description: 'Step into a 150-year-old wooden Nha Ruong surrounded by fragrant pomelo and jasmine.',
        descriptionVi: 'Chiêm ngưỡng ngôi nhà rường 150 năm tuổi nép mình bên vườn bưởi thanh trà thơm ngát.',
        locationName: 'Nhà vườn Kim Long',
        lat: 16.4632,
        lng: 107.5518
      }
    ],
    description: 'Guided by Bao Tri, a royal Nguyen dynasty descendant, this exclusive journey reveals the delicate balance of imperial philosophy, architecture, and refined royal gastronomy in the ancient capital of Hue.',
    descriptionVi: 'Được dẫn dắt bởi Bảo Trí - một hậu duệ hoàng tộc, hành trình này mang đến góc nhìn sâu sắc về triết lý cung đình, kiến trúc nhà rường và nét tinh hoa ẩm thực đất Cố Đô.',
    featured: false,
    createdAt: '2026-07-20',
    status: 'active'
  }
];

export const INITIAL_REVIEWS: TourReview[] = [
  {
    id: 'rev_1',
    tourId: 'tour_hn_01',
    userId: 'user_alex',
    userName: 'Alexander Wright',
    userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
    userCountry: 'Australia',
    rating: 5,
    date: '2026-08-10',
    comment: 'Tommy was the highlight of our Vietnam trip! Riding on the vintage scooter through the bustling Old Quarter was exhilarating yet completely safe. The hidden egg coffee shop was incredible.',
    tags: ['Safe Driver', 'Great English', 'Incredible Food', 'Hidden Gems']
  },
  {
    id: 'rev_2',
    tourId: 'tour_hn_01',
    userId: 'user_charlotte',
    userName: 'Charlotte Dubois',
    userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    userCountry: 'France',
    rating: 5,
    date: '2026-08-04',
    comment: 'The night pho and the walk on Long Bien Bridge under the stars gave me chills. Tommy treats you like his oldest friend returning home. 100% recommended!',
    tags: ['Authentic', 'Friendly Host', 'Must Do']
  },
  {
    id: 'rev_3',
    tourId: 'tour_sg_02',
    userId: 'user_kenji',
    userName: 'Kenji Takahashi',
    userAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80',
    userCountry: 'Japan',
    rating: 5,
    date: '2026-08-02',
    comment: 'Mai Linh’s deep knowledge of Chinatown heritage and Taoist temples was fascinating. The dim sum in the secret alley was the best I have ever tasted in Southeast Asia.',
    tags: ['Knowledgeable', 'Delicious Dim Sum', 'Fascinating History']
  }
];

export const INITIAL_BOOKINGS: Booking[] = [
  {
    id: 'VIS-8492',
    tourId: 'tour_hn_01',
    tourTitle: 'Hanoi Secret Alleys, Vintage Scooter & Midnight Pho Safari',
    tourTitleVi: 'Hà Nội Ngõ Hẻm Bí Mật, Xe Máy Cổ & Săn Phở Đêm',
    tourImage: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&auto=format&fit=crop&q=80',
    city: 'Hà Nội',
    hostId: 'user_host_1',
    hostName: 'Nguyễn Minh Tuấn (Tommy)',
    hostPhone: '+84 912 345 678',
    hostAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    customerId: 'user_cust_1',
    customerName: 'Sarah Jenkins',
    customerEmail: 'customer@visgo.vn',
    customerPhone: '+84 901 234 567',
    bookingDate: '2026-08-20',
    bookingTime: '18:00',
    guestsCount: 2,
    totalPriceVND: 1300000,
    totalPriceUSD: 52,
    platformFeeVND: 195000,
    status: 'confirmed',
    createdAt: '2026-08-16',
    notes: 'No pork for one guest if possible, beef is great!',
    hasReviewed: false,
    meetingPoint: 'Hanoi Opera House, 1 Tràng Tiền, Hoàn Kiếm'
  },
  {
    id: 'VIS-7310',
    tourId: 'tour_sg_02',
    tourTitle: 'Saigon Chinatown (Chợ Lớn) Heritage, Taoist Temples & Secret Dim Sum',
    tourTitleVi: 'Sài Gòn Chợ Lớn: Di Sản Người Hoa, Chùa Cổ & Dim Sum Hẻm',
    tourImage: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800&auto=format&fit=crop&q=80',
    city: 'TP. Hồ Chí Minh',
    hostId: 'user_host_2',
    hostName: 'Trần Thị Mai Linh',
    hostPhone: '+84 933 456 789',
    hostAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    customerId: 'user_cust_1',
    customerName: 'Sarah Jenkins',
    customerEmail: 'customer@visgo.vn',
    customerPhone: '+84 901 234 567',
    bookingDate: '2026-08-25',
    bookingTime: '08:30',
    guestsCount: 1,
    totalPriceVND: 590000,
    totalPriceUSD: 24,
    platformFeeVND: 88500,
    status: 'confirmed',
    createdAt: '2026-08-17',
    notes: 'Excited to take cultural street photos!',
    hasReviewed: false,
    meetingPoint: 'Cha Tam Church, 25 Học Lạc, District 5'
  }
];

/**
 * One declaration per host, because a host may not publish without one.
 *
 * These used to name `user_applicant_1` and `user_applicant_2` — two ids with
 * no account, no profile and no tour behind them. The queue looked busy and
 * referred to nobody, while the six hosts who had actually published had
 * declared nothing.
 *
 * The citizen ID numbers are structurally correct rather than real: twelve
 * digits, opening with the province code of where the host lives (001 Hà Nội,
 * 079 TP.HCM, 048 Đà Nẵng, 049 Quảng Nam, 068 Lâm Đồng, 046 Huế), then a
 * gender-and-century digit and the last two digits of the birth year.
 */
export const INITIAL_HOST_KYC: HostKycApplication[] = [
  {
    id: 'kyc_host_1',
    hostId: 'user_host_1',
    fullName: 'Nguyễn Minh Tuấn',
    cccdNumber: '001091000123',
    dateOfBirth: '1991-06-14',
    nationality: 'Việt Nam',
    address: 'Số 18, ngõ 41 phố Hàng Bồ, phường Hoàn Kiếm, Hà Nội',
    submittedDate: '2026-07-02',
    status: 'approved',
  },
  {
    id: 'kyc_host_2',
    hostId: 'user_host_2',
    fullName: 'Trần Thị Mai Linh',
    cccdNumber: '079193004567',
    dateOfBirth: '1993-11-03',
    nationality: 'Việt Nam',
    address: 'Số 112 đường Trần Hưng Đạo, phường Chợ Quán, TP. Hồ Chí Minh',
    submittedDate: '2026-07-09',
    status: 'approved',
  },
  {
    id: 'kyc_host_3',
    hostId: 'user_host_3',
    fullName: 'Lê Văn Hoàng',
    cccdNumber: '048088001122',
    dateOfBirth: '1988-02-27',
    nationality: 'Việt Nam',
    address: 'Số 7 đường Hoàng Sa, phường Sơn Trà, Đà Nẵng',
    submittedDate: '2026-07-15',
    status: 'approved',
  },
  {
    id: 'kyc_host_4',
    hostId: 'user_host_4',
    fullName: 'Võ Minh Châu',
    cccdNumber: '049192003344',
    dateOfBirth: '1992-09-08',
    nationality: 'Việt Nam',
    address: 'Số 23 đường Trần Phú, phường Hội An, Đà Nẵng',
    submittedDate: '2026-07-21',
    status: 'approved',
  },
  {
    id: 'kyc_host_5',
    hostId: 'user_host_5',
    fullName: 'Đặng Quốc Bảo',
    cccdNumber: '068090005566',
    dateOfBirth: '1990-04-19',
    nationality: 'Việt Nam',
    address: 'Số 5B đường Trần Hưng Đạo, phường Xuân Hương, Lâm Đồng',
    submittedDate: '2026-08-04',
    status: 'approved',
  },
  {
    // Still waiting, on purpose: it is what keeps the admin review queue
    // showing a real case, and it is why this host's profile is not verified.
    id: 'kyc_host_6',
    hostId: 'user_host_6',
    fullName: 'Nguyễn Phước Bảo Trí',
    cccdNumber: '046095007788',
    dateOfBirth: '1995-12-01',
    nationality: 'Việt Nam',
    address: 'Số 9 đường Lê Lợi, phường Thuận Hóa, Huế',
    submittedDate: '2026-08-24',
    status: 'pending',
  },
];

/**
 * Local intro videos, one per destination.
 *
 * Every id below was checked against YouTube before it was written here — the
 * previous list of "curated" videos shipped eight invented ids, and every one
 * of them rendered a play button over a video that has never existed.
 * `npm run test:youtube` keeps the check honest, and the admin form now refuses
 * a link YouTube does not have.
 *
 * These belong to their creators; ViS-Go embeds them, exactly as any site may,
 * and every card carries a link out to the video's own page.
 */
export const INITIAL_LOCAL_VIDEOS: LocalVideo[] = [
  {
    id: 'vid_hanoi',
    city: 'Hà Nội',
    url: 'https://www.youtube.com/watch?v=SPaE-T5w16g',
    title: 'Places to visit in North Vietnam — Hanoi, Ninh Binh & beyond',
    titleVi: 'Miền Bắc có gì: Hà Nội, Ninh Bình và những nơi nên đi',
    order: 1,
    active: true,
    createdAt: '2026-08-28',
  },
  {
    id: 'vid_saigon',
    city: 'TP. Hồ Chí Minh',
    url: 'https://www.youtube.com/watch?v=rbNZbC2IqLs',
    title: 'Best things to do in Vietnam — 4K travel guide',
    titleVi: 'Việt Nam nên đi đâu, làm gì — cẩm nang quay 4K',
    order: 2,
    active: true,
    createdAt: '2026-08-28',
  },
  {
    id: 'vid_danang',
    city: 'Đà Nẵng',
    url: 'https://www.youtube.com/watch?v=T4IcTq9YQ8Y',
    title: 'The ultimate Da Nang travel guide',
    titleVi: 'Đà Nẵng: cẩm nang khám phá đầy đủ',
    order: 3,
    active: true,
    createdAt: '2026-08-28',
  },
  {
    id: 'vid_hoian',
    city: 'Hội An',
    url: 'https://www.youtube.com/watch?v=dMPGfnRipUA',
    title: 'Hoi An, Da Nang & the Hai Van Pass',
    titleVi: 'Hội An, Đà Nẵng và cung đèo Hải Vân',
    order: 4,
    active: true,
    createdAt: '2026-08-28',
  },
  {
    id: 'vid_hue',
    city: 'Huế',
    url: 'https://www.youtube.com/watch?v=FzvENi0U0-w',
    title: 'Central Vietnam in six days — Da Nang, Hoi An & Hue',
    titleVi: 'Miền Trung 6 ngày: Đà Nẵng, Hội An và Huế',
    order: 5,
    active: true,
    createdAt: '2026-08-28',
  },
  {
    id: 'vid_ninhbinh',
    city: 'Ninh Bình',
    url: 'https://www.youtube.com/watch?v=SKXLaflxITU',
    title: 'Seven days in northern Vietnam — Ninh Binh, Sapa & Hanoi',
    titleVi: 'Bảy ngày miền Bắc: Ninh Bình, Sa Pa và Hà Nội',
    order: 6,
    active: true,
    createdAt: '2026-08-28',
  },
  {
    id: 'vid_sapa',
    city: 'Sa Pa',
    url: 'https://www.youtube.com/watch?v=3RaFlN8Rig0',
    title: 'Thirty days across Vietnam — Hanoi, Sapa, Hoi An & Da Lat',
    titleVi: 'Ba mươi ngày dọc Việt Nam: Hà Nội, Sa Pa, Hội An, Đà Lạt',
    order: 7,
    active: true,
    createdAt: '2026-08-28',
  },
  {
    id: 'vid_dalat',
    city: 'Đà Lạt',
    url: 'https://www.youtube.com/watch?v=qcbNp0giYPE',
    title: 'Fourteen days in Vietnam — Hanoi, Ninh Binh, Nha Trang & Da Lat',
    titleVi: 'Mười bốn ngày ở Việt Nam: Hà Nội, Ninh Bình, Nha Trang, Đà Lạt',
    order: 8,
    active: true,
    createdAt: '2026-08-28',
  },
];
