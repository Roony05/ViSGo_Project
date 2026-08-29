/**
 * VR heritage destinations — real 360° photography only.
 *
 * Every entry names a Mapillary image id that was resolved, downloaded and
 * *looked at* before being pinned here. That check is not optional: the nearest
 * 360° image to a monument is very often a road several hundred metres away
 * with nothing of the monument in frame, and pinning by proximity alone
 * produces a gallery of anonymous streets labelled as heritage sites.
 *
 * It is also why the list is what it is. Mapillary's Vietnamese coverage comes
 * from dashcam and motorbike captures — dense in Hanoi, Ho Chi Minh City,
 * Da Nang, Hoi An, Da Lat and Ha Long, absent at Hue, My Son, Phong Nha,
 * Sa Pa, Ninh Binh and out on Ha Long Bay itself. Landmarks with no photograph
 * are not listed, because the alternative is claiming to show someone a place
 * we cannot show them.
 *
 * Names describe what the photograph actually contains. "Bai Chay waterfront"
 * rather than "Ha Long Bay", because the picture is of the promenade and the
 * bay is a boat ride away.
 *
 * Ids are pinned, never URLs: Mapillary serves images from a CDN with an `oe=`
 * expiry a few days out, so a baked-in URL would rot. `/api/panorama?ids=`
 * resolves the whole gallery in one request.
 */

export interface VrLandmark {
  id: string;
  name: string;
  nameVi: string;
  city: string;
  cityVi: string;
  /** Short line shown on the gallery card. */
  tagline: string;
  taglineVi: string;
  description: string;
  descriptionVi: string;
  unesco: boolean;
  bestTime: string;
  bestTimeVi: string;
  lat: number;
  lng: number;
  /** Accent colour for the card. */
  accent: string;
  /** Mapillary image id — a 360° photograph verified to show this place. */
  mapillaryId: string;
}

export const VR_LANDMARKS: VrLandmark[] = [
  {
    id: 'vr_hoankiem',
    name: 'Hoan Kiem Lake & The Huc Bridge',
    nameVi: 'Hồ Hoàn Kiếm & cầu Thê Húc',
    city: 'Hanoi',
    cityVi: 'Hà Nội',
    tagline: 'The lakeside path, with the red bridge across the water',
    taglineVi: 'Lối đi ven hồ, cầu son đỏ vắt ngang mặt nước',
    description:
      'Legend says emperor Le Loi returned a magic sword to a golden turtle here. Stand on the shaded promenade and the scarlet The Huc bridge sits across the water to Ngoc Son temple.',
    descriptionVi:
      'Truyền thuyết kể vua Lê Lợi đã trả gươm thần cho rùa vàng tại đây. Đứng trên lối đi rợp bóng cây, cầu Thê Húc đỏ son vắt qua mặt nước sang đền Ngọc Sơn.',
    unesco: false,
    bestTime: 'Weekend evenings, walking-street hours',
    bestTimeVi: 'Tối cuối tuần, giờ phố đi bộ',
    lat: 21.0288,
    lng: 105.8525,
    accent: '#C0392B',
    mapillaryId: '1251737872104814',
  },
  {
    id: 'vr_phoco_hanoi',
    name: 'Hanoi Old Quarter',
    nameVi: 'Phố cổ Hà Nội',
    city: 'Hanoi',
    cityVi: 'Hà Nội',
    tagline: 'Cyclos, conical hats and shophouses at street level',
    taglineVi: 'Xích lô, nón lá và nhà ống ngay giữa lòng phố',
    description:
      'Thirty-six guild streets that have traded on the same corners for six centuries. This is the crossroads at its ordinary busiest: vendors, a cyclo, a water truck and the shophouse fronts stacked above.',
    descriptionVi:
      'Ba mươi sáu phố phường buôn bán trên đúng những góc phố ấy suốt sáu thế kỷ. Đây là ngã tư vào giờ đông bình thường nhất: gánh hàng rong, chiếc xích lô, xe téc nước và dãy nhà ống chồng lên nhau.',
    unesco: false,
    bestTime: 'Early morning, before the heat',
    bestTimeVi: 'Sáng sớm, trước khi nắng lên',
    lat: 21.0341,
    lng: 105.851,
    accent: '#B7791F',
    mapillaryId: '1031838711338487',
  },
  {
    name: 'Tran Quoc Pagoda & West Lake',
    id: 'vr_tranquoc',
    nameVi: 'Chùa Trấn Quốc & Hồ Tây',
    city: 'Hanoi',
    cityVi: 'Hà Nội',
    tagline: 'The oldest pagoda in Hanoi, on its causeway over the water',
    taglineVi: 'Ngôi chùa cổ nhất Hà Nội, trên con đường nổi giữa mặt nước',
    description:
      'Founded in the sixth century and moved here when the Red River ate its bank, Tran Quoc sits on an islet reached by a short causeway between West Lake and Truc Bach.',
    descriptionVi:
      'Dựng từ thế kỷ thứ 6, dời về đây khi sông Hồng lở bờ. Chùa Trấn Quốc nằm trên gò nhỏ, nối bằng con đường ngắn giữa Hồ Tây và hồ Trúc Bạch.',
    unesco: false,
    bestTime: 'Late afternoon, for the light on the water',
    bestTimeVi: 'Chiều muộn, khi nắng đổ trên mặt hồ',
    lat: 21.0479,
    lng: 105.838,
    accent: '#0E7490',
    mapillaryId: '1041269867113925',
  },
  {
    id: 'vr_dongxuan',
    name: 'Dong Xuan Market',
    nameVi: 'Chợ Đồng Xuân',
    city: 'Hanoi',
    cityVi: 'Hà Nội',
    tagline: 'Porters, conical hats and a street that never stops trading',
    taglineVi: 'Người bốc vác, nón lá, và con phố chưa bao giờ ngừng buôn bán',
    description:
      'The wholesale heart of the Old Quarter since 1889. Everything sold in the thirty-six streets passes through here first, which is why the road outside is a permanent unloading bay.',
    descriptionVi:
      'Đầu mối bán buôn của phố cổ từ năm 1889. Hàng bán ở ba mươi sáu phố phường đều qua đây trước, nên mặt đường bên ngoài lúc nào cũng là bãi bốc dỡ.',
    unesco: false,
    bestTime: 'Six to nine in the morning, when the lorries come',
    bestTimeVi: '6h đến 9h sáng, lúc xe hàng về',
    lat: 21.0388,
    lng: 105.8497,
    accent: '#B45309',
    mapillaryId: '1258036984796336',
  },
  {
    id: 'vr_phandinhphung',
    name: 'Phan Dinh Phung Street',
    nameVi: 'Phố Phan Đình Phùng',
    city: 'Hanoi',
    cityVi: 'Hà Nội',
    tagline: 'Century-old trees over a colonial villa street',
    taglineVi: 'Hàng cây trăm tuổi phủ bóng dãy biệt thự Pháp',
    description:
      'The most photographed street in Hanoi, and the widest: three rows of old sao đen trees running past the ochre villas along the northern wall of the Imperial Citadel.',
    descriptionVi:
      'Con phố được chụp ảnh nhiều nhất Hà Nội, và cũng rộng nhất: ba hàng sao đen cổ thụ chạy dọc những biệt thự vàng đất bên tường phía bắc Hoàng thành.',
    unesco: false,
    bestTime: 'Autumn, when the leaves turn',
    bestTimeVi: 'Mùa thu, lúc lá đổi màu',
    lat: 21.039,
    lng: 105.837,
    accent: '#4D7C0F',
    mapillaryId: '1027071152048611',
  },
  {
    id: 'vr_nhatholon',
    name: 'St Joseph’s Cathedral',
    nameVi: 'Nhà thờ Lớn Hà Nội',
    city: 'Hanoi',
    cityVi: 'Hà Nội',
    tagline: 'Neo-gothic towers at the end of a Old Quarter street',
    taglineVi: 'Hai tháp chuông tân gothic cuối con phố cổ',
    description:
      'Built in 1886 on the site of the Bao Thien pagoda, its weathered grey towers close the end of Nha Tho street — the café-lined block that grew up to look at them.',
    descriptionVi:
      'Xây năm 1886 trên nền chùa Báo Thiên, hai tháp chuông xám loang chắn ngang cuối phố Nhà Thờ — dãy quán cà phê mọc lên chỉ để ngồi nhìn nó.',
    unesco: false,
    bestTime: 'Sunday morning, or evening over egg coffee',
    bestTimeVi: 'Sáng Chủ nhật, hoặc tối bên ly cà phê trứng',
    lat: 21.0288,
    lng: 105.849,
    accent: '#57534E',
    mapillaryId: '1025024035435331',
  },
  {
    id: 'vr_benthanh',
    name: 'Ben Thanh Market',
    nameVi: 'Chợ Bến Thành',
    city: 'Ho Chi Minh City',
    cityVi: 'TP. Hồ Chí Minh',
    tagline: 'The West Gate, with the whole roundabout turning around it',
    taglineVi: 'Cửa Tây, giữa vòng xoay xe cộ chảy quanh',
    description:
      'The 1912 market hall is the pin the city turns on. This is the West Gate — Cua Tay — with the shophouses of District 1 on one side and the cranes of the new city on the other.',
    descriptionVi:
      'Ngôi chợ dựng năm 1912 là cái đinh mà cả thành phố xoay quanh. Đây là Cửa Tây, một bên là dãy nhà phố Quận 1, bên kia là những cần cẩu của thành phố mới.',
    unesco: false,
    bestTime: 'Morning for produce, evening for the street kitchens',
    bestTimeVi: 'Sáng đi chợ, tối ăn hàng vỉa hè',
    lat: 10.7725,
    lng: 106.698,
    accent: '#B45309',
    mapillaryId: '1003740907550743',
  },
  {
    id: 'vr_nguyenhue',
    name: 'Nguyen Hue Walking Street',
    nameVi: 'Phố đi bộ Nguyễn Huệ',
    city: 'Ho Chi Minh City',
    cityVi: 'TP. Hồ Chí Minh',
    tagline: 'The boulevard dressed for Tet, towers on every side',
    taglineVi: 'Đại lộ trang hoàng đón Tết, cao ốc vây quanh',
    description:
      'A canal until 1887, a flower market every Tet since, and a pedestrian boulevard since 2015. The photograph catches it in red-and-gold New Year dress.',
    descriptionVi:
      'Vốn là con kênh đến năm 1887, thành đường hoa mỗi dịp Tết, và thành phố đi bộ từ 2015. Tấm ảnh bắt đúng lúc đại lộ khoác áo đỏ vàng đón năm mới.',
    unesco: false,
    bestTime: 'Tet week, or any evening after seven',
    bestTimeVi: 'Tuần Tết, hoặc bất cứ tối nào sau 19h',
    lat: 10.7743,
    lng: 106.7028,
    accent: '#DC2626',
    mapillaryId: '1024708045929034',
  },
  {
    id: 'vr_mykhe',
    name: 'My Khe Beach',
    nameVi: 'Biển Mỹ Khê',
    city: 'Da Nang',
    cityVi: 'Đà Nẵng',
    tagline: 'Coconut palms, the promenade, and the East Sea beyond',
    taglineVi: 'Hàng dừa, con đường ven biển và Biển Đông phía sau',
    description:
      'Thirty kilometres of open sand down the Son Tra coast. The palms along Vo Nguyen Giap street screen the beach from the road, and the water starts a few steps past them.',
    descriptionVi:
      'Ba mươi cây số cát trải dọc bờ Sơn Trà. Hàng dừa trên đường Võ Nguyên Giáp che bãi biển khỏi mặt đường, và chỉ vài bước chân nữa là tới nước.',
    unesco: false,
    bestTime: 'February to May, early morning',
    bestTimeVi: 'Tháng 2 đến tháng 5, lúc sáng sớm',
    lat: 16.0575,
    lng: 108.248,
    accent: '#0369A1',
    mapillaryId: '1687193938942049',
  },
  {
    id: 'vr_haivan',
    name: 'Hai Van Pass',
    nameVi: 'Đèo Hải Vân',
    city: 'Da Nang',
    cityVi: 'Đà Nẵng',
    tagline: 'The mountain road that cuts Vietnam’s weather in two',
    taglineVi: 'Con đèo chia đôi thời tiết của cả nước',
    description:
      'Twenty-one kilometres over a spur of the Truong Son range, and the line where the northern winter stops. The Nguyen emperors called it the gate to the ocean clouds.',
    descriptionVi:
      'Hai mươi mốt cây số vắt qua một nhánh Trường Sơn, cũng là ranh giới nơi mùa đông miền Bắc dừng lại. Vua Nguyễn gọi đây là cửa ải của mây biển.',
    unesco: false,
    bestTime: 'Late morning, once the cloud lifts',
    bestTimeVi: 'Gần trưa, khi mây tan',
    lat: 16.1909,
    lng: 108.1277,
    accent: '#15803D',
    mapillaryId: '1400909228737879',
  },
  {
    id: 'vr_nguhanhson',
    name: 'Marble Mountains',
    nameVi: 'Ngũ Hành Sơn',
    city: 'Da Nang',
    cityVi: 'Đà Nẵng',
    tagline: 'Five marble outcrops standing straight out of flat ground',
    taglineVi: 'Năm ngọn núi đá vôi mọc thẳng lên từ đồng bằng',
    description:
      'Five limestone and marble hills named for the five elements, hollowed by caves and Buddhist shrines. From the coast road they rise abruptly out of otherwise level ground.',
    descriptionVi:
      'Năm ngọn núi đá vôi mang tên ngũ hành, bên trong là hang động và chùa chiền. Nhìn từ đường ven biển, chúng đột ngột nhô lên giữa vùng đất bằng phẳng.',
    unesco: false,
    bestTime: 'Morning, before the marble heats up',
    bestTimeVi: 'Buổi sáng, trước khi đá nóng lên',
    lat: 16.0035,
    lng: 108.263,
    accent: '#166534',
    mapillaryId: '4255151978030218',
  },
  {
    id: 'vr_hoian',
    name: 'Hoi An Riverside',
    nameVi: 'Phố cổ Hội An bên sông Hoài',
    city: 'Quang Nam',
    cityVi: 'Quảng Nam',
    tagline: 'The Hoai riverbank, old town on the far side',
    taglineVi: 'Bờ sông Hoài, phố cổ bên kia mặt nước',
    description:
      'A trading port that Japanese, Chinese and Dutch merchants all wrote home about, preserved because the river silted up and the trade left. The old town sits low along the far bank.',
    descriptionVi:
      'Thương cảng mà thương nhân Nhật, Hoa và Hà Lan đều viết thư về kể. Nó còn nguyên vì sông bồi lấp và thương thuyền bỏ đi. Phố cổ nằm thấp dọc bờ bên kia.',
    unesco: true,
    bestTime: 'Full-moon lantern nights, from 6pm',
    bestTimeVi: 'Đêm rằm thả đèn lồng, từ 18h',
    lat: 15.877,
    lng: 108.326,
    accent: '#CA8A04',
    mapillaryId: '1299688488928267',
  },
  {
    id: 'vr_dalat',
    name: 'Xuan Huong Lake',
    nameVi: 'Hồ Xuân Hương',
    city: 'Da Lat',
    cityVi: 'Đà Lạt',
    tagline: 'Pines on one shore, swan boats on the other',
    taglineVi: 'Một bên thông, một bên thuyền vịt',
    description:
      'A crescent of water dammed in 1919 at the centre of the hill station, ringed by a road the whole town walks in the cool of the morning.',
    descriptionVi:
      'Hồ hình lưỡi liềm được đắp đập năm 1919 ngay giữa thành phố cao nguyên, vòng quanh là con đường mà cả thị trấn đi bộ trong buổi sáng se lạnh.',
    unesco: false,
    bestTime: 'Dry season, any morning',
    bestTimeVi: 'Mùa khô, bất cứ buổi sáng nào',
    lat: 11.9404,
    lng: 108.4419,
    accent: '#15803D',
    mapillaryId: '1038024261024700',
  },
  {
    id: 'vr_mapileng',
    name: 'Ma Pi Leng Pass',
    nameVi: 'Đèo Mã Pí Lèng',
    city: 'Ha Giang',
    cityVi: 'Hà Giang',
    tagline: 'The road cut into the cliff, karst peaks on every side',
    taglineVi: 'Con đường xẻ vào vách đá, núi đá tai mèo vây bốn phía',
    description:
      'Twenty kilometres of road carved by hand into a limestone wall above the Nho Que river, on the Ha Giang loop. Men worked it with hammers and rope for six years to open the far north.',
    descriptionVi:
      'Hai mươi cây số đường đục bằng tay vào vách đá vôi trên sông Nho Quế, trên cung Hà Giang. Người ta treo mình bằng dây, đục bằng búa suốt sáu năm để mở đường lên cực Bắc.',
    unesco: false,
    bestTime: 'September to November, for the buckwheat',
    bestTimeVi: 'Tháng 9 đến tháng 11, mùa hoa tam giác mạch',
    lat: 23.2348,
    lng: 105.4068,
    accent: '#4D7C0F',
    mapillaryId: '1013397253922254',
  },
  {
    id: 'vr_dongvan',
    name: 'Dong Van Town',
    nameVi: 'Phố cổ Đồng Văn',
    city: 'Ha Giang',
    cityVi: 'Hà Giang',
    tagline: 'A mountain town’s main street, limestone ridges behind it',
    taglineVi: 'Phố chính của thị trấn vùng cao, sau lưng là dãy núi đá',
    description:
      'The highest market town on the Dong Van karst plateau, a UNESCO Global Geopark. On Sunday mornings the Hmong, Tay and Dao come down to trade and the whole street fills up.',
    descriptionVi:
      'Thị trấn chợ cao nhất trên cao nguyên đá Đồng Văn, Công viên Địa chất Toàn cầu UNESCO. Sáng Chủ nhật người Mông, Tày, Dao xuống chợ, cả con phố chật kín.',
    unesco: false,
    bestTime: 'Sunday morning, market day',
    bestTimeVi: 'Sáng Chủ nhật, phiên chợ',
    lat: 23.2765,
    lng: 105.3658,
    accent: '#7C2D12',
    mapillaryId: '1074153220916184',
  },
  {
    id: 'vr_chodalat',
    name: 'Da Lat Market',
    nameVi: 'Chợ Đà Lạt',
    city: 'Da Lat',
    cityVi: 'Đà Lạt',
    tagline: 'The market crossroads, mountain weather overhead',
    taglineVi: 'Ngã tư chợ, trên đầu là trời cao nguyên',
    description:
      'Everything the plateau grows arrives here: artichokes, strawberries, dried persimmon, flowers by the crate. The square in front of it is where the whole town crosses paths.',
    descriptionVi:
      'Mọi thứ cao nguyên trồng được đều đổ về đây: atisô, dâu tây, hồng khô, hoa cả thùng. Khoảng sân trước chợ là chỗ cả thị trấn đi ngang nhau.',
    unesco: false,
    bestTime: 'From four in the afternoon, as the night market sets up',
    bestTimeVi: 'Từ 16h, lúc chợ đêm bắt đầu dọn hàng',
    lat: 11.9441,
    lng: 108.4364,
    accent: '#BE185D',
    mapillaryId: '1203197984296551',
  },
  {
    id: 'vr_baichay',
    name: 'Bai Chay Waterfront',
    nameVi: 'Bờ biển Bãi Cháy',
    city: 'Quang Ninh',
    cityVi: 'Quảng Ninh',
    tagline: 'The promenade where the boats to the bay leave from',
    taglineVi: 'Con đường ven biển, nơi tàu ra vịnh xuất bến',
    description:
      'The shore town facing Ha Long Bay, and where every trip onto the water begins. The bay’s limestone towers are out past the harbour, an hour by boat.',
    descriptionVi:
      'Thị trấn ven bờ nhìn ra vịnh Hạ Long, cũng là nơi mọi chuyến ra vịnh bắt đầu. Những hòn đá vôi nằm ngoài kia, cách bến chừng một giờ tàu.',
    unesco: false,
    bestTime: 'October to April, at dusk',
    bestTimeVi: 'Tháng 10 đến tháng 4, lúc chạng vạng',
    lat: 20.954,
    lng: 107.043,
    accent: '#0F766E',
    mapillaryId: '506717558447275',
  },
];

export const findLandmark = (id: string): VrLandmark | undefined =>
  VR_LANDMARKS.find((l) => l.id === id);
