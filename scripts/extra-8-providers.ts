export interface OfferingItem {
  id: string;
  title: string;
  category: string;
  price: number;
  description: string;
  parametersSchema?: any;
}

export interface LocationItem {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  radius: number;
}

export interface ProviderDef {
  slug: string;
  name: string;
  type: string;
  category: string;
  description: string;
  rating: number;
  phone: string;
  hours: string;
  baseUrl: string;
  locations: LocationItem[];
  offerings: OfferingItem[];
}

export const EXTRA_8_PROVIDERS: ProviderDef[] = [
  // 18. Safar Umrah Travel
  {
    slug: 'umrah-travel',
    name: 'Safar Umrah — Umra va Haj Ziyorat Sayyohligi',
    type: 'BOOKINGS',
    category: 'travel_tourism',
    description: 'Umra va Haj ziyoratlari bo‘yicha to‘liq xizmatlar: to‘g‘ridan-to‘g‘ri reyslar, Makka va Madinada 4-5 yulduzli mehmonxonalar, tajribali ellikboshilar hamrohligi.',
    rating: 4.96,
    phone: '+998712007788',
    hours: '09:00 - 20:00',
    baseUrl: 'https://evos-sandbox.shopla.uz',
    locations: [
      { id: 'umr-loc-toshkent', name: 'Safar Umrah Toshkent Bosh Ofisi', address: 'Toshkent sh., Mirobod tumani, Nukus ko‘chasi, 29-uy', lat: 41.291, lng: 69.272, radius: 30 },
      { id: 'umr-loc-samarqand', name: 'Safar Umrah Samarqand filiali', address: 'Samarqand sh., Registon ko‘chasi, 14-uy', lat: 39.654, lng: 66.975, radius: 30 }
    ],
    offerings: [
      { id: 'umr-01', title: 'Umra Ekonom Paketi (14 kun)', category: 'package', price: 14500000, description: 'Aviachipta, 3 yulduzli mehmonxona, viza, transfer, ellikboshi xizmati.' },
      { id: 'umr-02', title: 'Umra Standart Paketi (14 kun)', category: 'package', price: 17500000, description: 'To‘g‘ridan-to‘g‘ri reys, 4 yulduzli mehmonxona (Haramga 800m), kunlik 2 mahal taom.' },
      { id: 'umr-03', title: 'Umra Komfort Paketi (14 kun)', category: 'package', price: 21500000, description: 'Haramga yaqin 5 yulduzli mehmonxona, shved stoli, qulay transferlar va sovg‘alar.' },
      { id: 'umr-04', title: 'Umra VIP Paketi (10 kun)', category: 'package', price: 32000000, description: 'Al-Safwa yoki Hilton mehmonxonalari (Haram ro‘parasida), biznes-klass aviaparvoz, shaxsiy transfer.' },
      { id: 'umr-05', title: 'Umra Ramazon Paketi (Ohirgi 10 kunlik)', category: 'package', price: 28000000, description: 'Qadr kechalari Makka va Madinada bo‘lish imkoniyati, iftorlik va saharliklar bilan.' },
      { id: 'umr-06', title: 'Umra Oilaviy Paketi (4 kishilik oila uchun 14 kun)', category: 'family_package', price: 68000000, description: 'Alohida 4 kishilik oilaviy xona, qulay transport va maxsus xizmat ko‘rsatish.' },
      { id: 'umr-07', title: 'Makka shahridagi ziyoratlar ekskursiyasi', category: 'excursion', price: 650000, description: 'Savr tog‘i, Nur tog‘i (Hiro g‘ori), Mino, Muzdalifa va Arofat vodiylariga ziyorat.' },
      { id: 'umr-08', title: 'Madina shahridagi muqaddas qadamjolar ziyorati', category: 'excursion', price: 650000, description: 'Uhud tog‘i va shahidlari, Qubo masjidi, Qiblatayn masjidi va Xurmo bog‘lari.' },
      { id: 'umr-09', title: 'Qizil dengiz sohiliga sayohat (Jidda shahri)', category: 'excursion', price: 850000, description: 'Qadimgi Al-Balad tarixiy shaharchasi, Suzuvchi masjid va Qizil dengiz qirg‘og‘i bo‘ylab sayr.' },
      { id: 'umr-10', title: 'Badr jangi maydoni va shuxadolar ziyorati', category: 'excursion', price: 750000, description: 'Tarixiy Badr maydoniga maxsus avtobusda tashkil etilgan ilmiy-tarixiy safar.' },
      { id: 'umr-11', title: 'To‘g‘ridan-to‘g‘ri Toshkent - Jidda aviaparvozi chiptasi', category: 'flight', price: 8900000, description: 'To‘g‘ridan-to‘g‘ri qulay charter yoki muntazam reys, 25kg yuk bilan.' },
      { id: 'umr-12', title: 'Saudiya Arabistoni elektron Umra vizasi', category: 'visa', price: 2100000, description: '1 yillik ko‘p martalik (multiple) kirish huquqini beruvchi rasmiy elektron viza va sug‘urta.' },
      { id: 'umr-13', title: 'VIP Shaxsiy transfer (Jidda aeroporti - Makka mehmonxona)', category: 'transfer', price: 1400000, description: 'GMC Yukon yoki Toyota Alphard avtomobilida qulay va tezkor transfer.' },
      { id: 'umr-14', title: 'Tezyurar Haramain poyezdi chiptasi (Makka - Madina)', category: 'transfer', price: 900000, description: 'Zamonaviy poyezdda 2 soat 20 daqiqada qulay sayohat (Biznes/Ekonom).' },
      { id: 'umr-15', title: 'Shaxsiy ellikboshi va gid hamrohligi xizmati', category: 'service', price: 1800000, description: 'Ziyorat arkonlarini to‘liq o‘rgatuvchi va ibodatlarda yo‘lboshchilik qiluvchi mutaxassis.' },
      { id: 'umr-16', title: 'Haramda aravacha va ko‘makchi hamroh xizmati', category: 'assistance', price: 1200000, description: 'Keksalar yoki harakatlanishi cheklangan ziyoratchilar uchun tavof va sa’yda shaxsiy ko‘mak.' },
      { id: 'umr-17', title: 'Tabarruk Zamzam suvi (5 litrlik qadoqda aeroportda)', category: 'essentials', price: 150000, description: 'Saudiya davlati tomonidan ruxsat etilgan zavod qadog‘idagi asl Zamzam suvi.' },
      { id: 'umr-18', title: 'Ziyoratchi to‘liq anjomlar to‘plami', category: 'essentials', price: 450000, description: 'Ixrom matosi, kamar, chamadon, yelkama sumka, beydjik va duo kitoblari to‘plami.' },
      { id: 'umr-19', title: 'Tibbiy sug‘urta va shifokor nazorati xizmati', category: 'medical', price: 350000, description: 'Safar davomida 24/7 guruh shifokori nazorati va xalqaro sug‘urta polisi.' },
      { id: 'umr-20', title: 'Bolalar uchun Umra safariga maxsus chegirmali chipta', category: 'child_package', price: 9800000, description: '2 yoshdan 12 yoshgacha bo‘lgan bolalar uchun alohida o‘rin va dastur.' },
      { id: 'umr-21', title: 'Taif shahriga bir kunlik tarixiy ekskursiya', category: 'excursion', price: 950000, description: 'Taif masjidi, Addos bog‘i, teleferik va mashhur Taif atirgul moyi fabrikasi.' }
    ].map(o => ({
      ...o,
      parametersSchema: {
        type: 'object',
        required: ['pilgrim_full_name', 'doc_number', 'birth_date', 'gender', 'preferred_month', 'room_sharing', 'contact_phone'],
        properties: {
          pilgrim_full_name: { type: 'string', title: 'Ziyoratchi to‘liq ismi (Pasportdagidek)' },
          doc_number: { type: 'string', title: 'Xorijiy pasport yoki ID raqami' },
          birth_date: { type: 'string', title: 'Tug‘ilgan sana (YYYY-MM-DD)' },
          gender: { type: 'string', enum: ['Erkak', 'Ayol'], title: 'Jinsi' },
          preferred_month: { type: 'string', enum: ['Shavvol', 'Zulqa’da', 'Ramazon', 'Kuz oylari', 'Qish mavsumi'], title: 'Mo‘ljallangan safar oyi' },
          room_sharing: { type: 'string', enum: ['2 kishilik xona', '3 kishilik xona', '4 kishilik xona'], title: 'Mehmonxona xonasi turi' },
          has_mahram: { type: 'boolean', title: 'Ayol ziyoratchi uchun mahram bormi' },
          contact_phone: { type: 'string', title: 'Aloqa telefon raqami' }
        }
      }
    }))
  },

  // 19. RentCar Express Toshkent
  {
    slug: 'rentcar-express',
    name: 'RentCar Express — Avtomobil Ijarasi va Prokat',
    type: 'BOOKINGS',
    category: 'auto_rental',
    description: 'Toshkent va viloyatlar bo‘ylab yangi avtomobillar ijarasi: depozitsiz, to‘liq KASKO sug‘urtasi bilan, aeroport va temir yo‘l vokzallariga bepul yetkazib berish.',
    rating: 4.88,
    phone: '+998781405050',
    hours: '24/7',
    baseUrl: 'https://evos-sandbox.shopla.uz',
    locations: [
      { id: 'rc-loc-aeroport', name: 'RentCar Toshkent Xalqaro Aeroporti filiali', address: 'Toshkent sh., Qumariq ko‘chasi, Terminal 2 avtoturargohi', lat: 41.258, lng: 69.282, radius: 40 },
      { id: 'rc-loc-chilonzor', name: 'RentCar Chilonzor Markaziy Parki', address: 'Toshkent sh., Chilonzor tumani, Bunyodkor shoh ko‘chasi, 52-uy', lat: 41.275, lng: 69.205, radius: 30 }
    ],
    offerings: [
      { id: 'rc-01', title: 'Chevrolet Onix Turbo 1.2 AT (Kunlik ijara)', category: 'sedan_economy', price: 390000, description: 'Avtomat karobka, lyuk, kruiz-kontrol, konditsioner, benzin tejamkor.' },
      { id: 'rc-02', title: 'Chevrolet Cobalt 1.5 AT Style (Kunlik ijara)', category: 'sedan_economy', price: 320000, description: 'Ishonchli shahar va viloyat qatnovlari uchun, avtomat karobka, toza salon.' },
      { id: 'rc-03', title: 'Chevrolet Lacetti Gentra 1.5 AT (Kunlik ijara)', category: 'sedan_economy', price: 300000, description: 'Qulay shahar sedani, avtomat uzatma, to‘liq texnik nazoratdan o‘tgan.' },
      { id: 'rc-04', title: 'Chevrolet Tracker 2 Premier Plus (Kunlik ijara)', category: 'crossover', price: 550000, description: 'Panoramali tom, charm salon, 360 kamera, zamonaviy shahar krossoveri.' },
      { id: 'rc-05', title: 'Chevrolet Malibu 2 XL 2.0 Turbo (Kunlik ijara)', category: 'business_sedan', price: 750000, description: 'Biznes klass sedani, qora rang, to‘liq qulaylik va yuqori dinamika.' },
      { id: 'rc-06', title: 'Chevrolet Traverse 3.6 AWD (Kunlik ijara)', category: 'suv_large', price: 1200000, description: '7 o‘rinli oilaviy premium yo‘ltanlamas, to‘liq privod, ulkan yukxona.' },
      { id: 'rc-07', title: 'Chevrolet Tahoe 5.3 V8 (Kunlik ijara)', category: 'suv_luxury', price: 2100000, description: 'Hashamatli to‘liq o‘lchamli yo‘ltanlamas, nufuzli uchrashuvlar uchun ideal.' },
      { id: 'rc-08', title: 'BYD Song Plus Champion DM-i (Kunlik ijara)', category: 'hybrid_suv', price: 650000, description: 'Gibrid krossover, 1100 km zaxira yurish masofasi, jim va tejamkor haydash.' },
      { id: 'rc-09', title: 'BYD Chazor Plug-in Hybrid (Kunlik ijara)', category: 'hybrid_sedan', price: 490000, description: 'Zamonaviy tejamkor sedan, yuqori darajadagi elektronika va qulaylik.' },
      { id: 'rc-10', title: 'Kia K5 2.5 GT-Line (Kunlik ijara)', category: 'business_sedan', price: 850000, description: 'Sportiv dizayn, qizil charm salon, panoramali lyuk, akustik tizim.' },
      { id: 'rc-11', title: 'Kia Sportage 2.0 AWD X-Line (Kunlik ijara)', category: 'crossover', price: 790000, description: 'Universal qulay krossover, tog‘ va shahar safarlari uchun ayni muddao.' },
      { id: 'rc-12', title: 'Hyundai Sonata 2.5 AT (Kunlik ijara)', category: 'business_sedan', price: 780000, description: 'Keng salon, yuqori darajadagi shovqinsizlantirish, kruiz nazorati.' },
      { id: 'rc-13', title: 'Hyundai Santa Fe 2.5 AWD 7 o‘rinli (Kunlik ijara)', category: 'suv_large', price: 1100000, description: 'Katta oila va tog‘ kurortlari uchun 7 o‘rinli mukammal avtomobil.' },
      { id: 'rc-14', title: 'Mercedes-Benz S-Class W222 (Shaxsiy haydovchi bilan 8 soat)', category: 'vip_chauffeur', price: 2800000, description: 'VIP mehmonlarni kutib olish, delegatsiyalar va to‘y marosimlari uchun.' },
      { id: 'rc-15', title: 'Mercedes-Benz Sprinter 18 o‘rinli mikroavtobus (Kunlik)', category: 'minibus', price: 1500000, description: 'Katta guruhlar va delegatsiyalar uchun qulay yumshoq o‘rindiqli mikroavtobus.' },
      { id: 'rc-16', title: 'Toyota Land Cruiser 300 V6 (Kunlik ijara)', category: 'suv_luxury', price: 2600000, description: 'Afsonaviy nufuzli yo‘ltanlamas, eng yuqori darajadagi qulaylik va xavfsizlik.' },
      { id: 'rc-17', title: 'Chevrolet Damas Deluxe (Kunlik tijorat ijarasi)', category: 'commercial', price: 220000, description: 'Yuk va shahar ichida mayda tovarlar tashish uchun qulay va ixcham.' },
      { id: 'rc-18', title: 'Bolalar avto-o‘rindig‘i (IsoFix xavfsizlik kreslosi)', category: 'accessory', price: 50000, description: 'Chaqaloqlar va bolalar uchun xavfsiz sertifikatlangan o‘rindiq.' },
      { id: 'rc-19', title: 'GPS Navigator va cheksiz 4G Wi-Fi router (Kunlik)', category: 'accessory', price: 40000, description: 'Salonda butun oila uchun doimiy tezkor internet va qulay navigatsiya.' },
      { id: 'rc-20', title: 'To‘liq KASKO Nol javobgarlik sug‘urtasi', category: 'insurance', price: 95000, description: 'Har qanday mayda tirnalish va shikastlanishlarda moliyaviy xotirjamlik.' },
      { id: 'rc-21', title: 'Avtomobilni manzilga / aeroportga yetkazib berish', category: 'delivery_service', price: 70000, description: 'Toshkent shahri bo‘ylab istalgan manzilga toza holda topshirish.' }
    ].map(o => ({
      ...o,
      parametersSchema: {
        type: 'object',
        required: ['driver_full_name', 'driver_license_number', 'rental_days', 'pickup_datetime', 'delivery_location', 'destination_region', 'contact_phone'],
        properties: {
          driver_full_name: { type: 'string', title: 'Haydovchi F.I.O' },
          driver_license_number: { type: 'string', title: 'Haydovchilik guvohnomasi seriyasi va raqami' },
          driver_age: { type: 'integer', title: 'Haydovchi yoshi' },
          rental_days: { type: 'integer', title: 'Ijara kunlari soni' },
          pickup_datetime: { type: 'string', title: 'Qabul qilish sanasi va vaqti' },
          delivery_location: { type: 'string', title: 'Qabul qilish manzili (Aeroport, Vokzal, Ofis, Manzilga)' },
          destination_region: { type: 'string', enum: ['Faqat Toshkent shahri', 'Toshkent viloyati / Tog‘ zonalari', 'Viloyatlararo safar'], title: 'Harakatlanish hududi' },
          needs_child_seat: { type: 'boolean', title: 'Bolalar o‘rindig‘i kerakmi' },
          contact_phone: { type: 'string', title: 'Telefon raqami' }
        }
      }
    }))
  },

  // 20. Oqtepa Lavash
  {
    slug: 'oqtepa-lavash',
    name: 'Oqtepa Lavash — Fast Food va Lavashlar',
    type: 'DELIVERY',
    category: 'food_dining',
    description: 'O‘zbekistonning sevimli tez tayyorlanadigan milliy fast-food tarmog‘i: mazali lavashlar, pita shaurma, pishloqli gamburgerlar va tovuqli stripslar.',
    rating: 4.86,
    phone: '+998781500030',
    hours: '09:00 - 03:00',
    baseUrl: 'https://evos-sandbox.shopla.uz',
    locations: [
      { id: 'oq-loc-oqtepa', name: 'Oqtepa Lavash Bosh Filiali', address: 'Toshkent sh., Uchtepa tumani, Oqtepa maydoni', lat: 41.298, lng: 69.215, radius: 10 },
      { id: 'oq-loc-yunus', name: 'Oqtepa Lavash Yunusobod', address: 'Toshkent sh., Yunusobod tumani, 4-mavze', lat: 41.358, lng: 69.289, radius: 10 },
      { id: 'oq-loc-chilonzor', name: 'Oqtepa Lavash Chilonzor 9', address: 'Toshkent sh., Chilonzor tumani, 9-mavze', lat: 41.272, lng: 69.201, radius: 10 }
    ],
    offerings: [
      { id: 'oq-01', title: 'Klassik Mol go‘shtli Lavash (Standart)', category: 'lavash', price: 33000, description: 'Yupqa xamir, mayin mol go‘shti, qizarib pishgan pomidor, bodring, maxsus tomat va oq sous.' },
      { id: 'oq-02', title: 'Klassik Mol go‘shtli Lavash (Katta Big)', category: 'lavash', price: 39000, description: 'Ko‘proq go‘sht va qarsildoq sabzavotlar bilan katta porsiyadagi to‘yimli lavash.' },
      { id: 'oq-03', title: 'Pishloqli (Sirli) Mol go‘shtli Lavash', category: 'lavash', price: 38000, description: 'Erib oquvchi Golland pishlog‘i va suvli mol go‘shti uyg‘unligi.' },
      { id: 'oq-04', title: 'Tovuqli Lavash (Standart)', category: 'lavash', price: 31000, description: 'Grilda marinovka qilib qovurilgan tovuq filesi, bodring, pomidor, oq sous.' },
      { id: 'oq-05', title: 'Tandir Lavash Mol go‘shtli', category: 'lavash', price: 37000, description: 'Haqiqiy tandirda toblab pishirilgan qarsildoq maxsus xamirli lavash.' },
      { id: 'oq-06', title: 'Shaurma Pita nonida Mol go‘shtli', category: 'shaurma', price: 28000, description: 'Dumaloq arabcha pitada mol go‘shti va sabzavotlar.' },
      { id: 'oq-07', title: 'Shaurma Nonida Tovuqli', category: 'shaurma', price: 26000, description: 'Issiq pita nonida mayin tovuq go‘shti va marinadlangan piyoz, sous.' },
      { id: 'oq-08', title: 'Doner Nonida Mol go‘shtli (Katta)', category: 'doner', price: 32000, description: 'Yumshoq turkcha nonda suvli doner go‘shti, qizil karam va fri kartoshkasi.' },
      { id: 'oq-09', title: 'Klabb Sendvich kartoshka fri bilan', category: 'sandwich', price: 36000, description: 'Tosterda qizartirilgan non, kurka go‘shti, pishloq, tuxum, pomidor va fri kartoshka.' },
      { id: 'oq-10', title: 'Gamburger Klassik mol go‘shtli', category: 'burgers', price: 26000, description: 'Suvli kotlet, marinadlangan bodring, pomidor, marul barglari va sous.' },
      { id: 'oq-11', title: 'Chizburger mol go‘shtli erigan pishloq bilan', category: 'burgers', price: 29000, description: 'Klassik kotlet, ikki qavat Chedder pishlog‘i, yumshoq kunjutli bulochka.' },
      { id: 'oq-12', title: 'Dabl Chizburger (2 qavatli kotlet)', category: 'burgers', price: 39000, description: 'Ikki hissa mol go‘shti kotleti, mo‘l erigan pishloq va maxsus sous.' },
      { id: 'oq-13', title: 'Tovuq Stripslari (5 dona qarsildoq)', category: 'chicken', price: 27000, description: 'Maxsus ziravorli panada tayyorlangan mayin tovuq filesi bo‘laklari.' },
      { id: 'oq-14', title: 'Tovuq Qanotchalari Achchiq Hot (6 dona)', category: 'chicken', price: 32000, description: 'Karsillagan achchiq qovurilgan tovuq qanotlari.' },
      { id: 'oq-15', title: 'Kartoshka Fri (Standart)', category: 'fries', price: 16000, description: 'Tillarang qarsildoq qovurilgan kartoshka somonchalari.' },
      { id: 'oq-16', title: 'Qishloqcha Kartoshka (Derevenskiy)', category: 'fries', price: 18000, description: 'Xushbo‘y o‘tlar va sarimsoq bilan qobig‘ida qovurilgan kartoshka bo‘laklari.' },
      { id: 'oq-17', title: 'Pishloqli Koptokchalar (Mozzarella balls 6 dona)', category: 'snacks', price: 24000, description: 'Ichida cho‘ziluvchan Mozzarella pishlog‘i bo‘lgan qarsildoq gazak.' },
      { id: 'oq-18', title: 'Pishloqli Maxsus Sous Oqtepa', category: 'sauces', price: 5000, description: 'Kremsimon boy ta’mli Chedder pishloqli sous.' },
      { id: 'oq-19', title: 'Sarimsoqli Oq sous (Chesnochniy)', category: 'sauces', price: 5000, description: 'Klassik sarimsoq va ko‘katli mayin oq sous.' },
      { id: 'oq-20', title: 'Coca-Cola Classic 0.5L muzdek', category: 'beverages', price: 11000, description: 'Muzdek gazlangan tetiklantiruvchi ichimlik.' },
      { id: 'oq-21', title: 'Oqtepa Milliy Muzdek Ayron 0.4L', category: 'beverages', price: 8000, description: 'Yalpiz va bodringli tetiklantiruvchi milliy sutli ichimlik.' }
    ].map(o => ({
      ...o,
      parametersSchema: {
        type: 'object',
        required: ['delivery_address', 'contact_phone'],
        properties: {
          delivery_address: { type: 'string', title: 'Yetkazib berish manzili' },
          apartment_number: { type: 'string', title: 'Xonadon / ofis raqami' },
          spice_level: { type: 'string', enum: ['Oddiy (achchiqsiz)', 'O‘rtacha achchiq', 'Achchiq Hot'], title: 'Achchiqlik darajasi' },
          cut_lavash: { type: 'boolean', title: 'Lavashni 2 ga bo‘lib qadoqlash' },
          cutlery_count: { type: 'integer', title: 'Bir martalik anjomlar soni' },
          contact_phone: { type: 'string', title: 'Bog‘lanish telefon raqami' },
          notes: { type: 'string', title: 'Kuryerga qo‘shimcha eslatma' }
        }
      }
    }))
  },

  // 21. FeedUp Fast Food
  {
    slug: 'feedup',
    name: 'FeedUp — Qarsildoq Tovuq va Burgerlar',
    type: 'DELIVERY',
    category: 'food_dining',
    description: 'Karsillagan qovurilgan tovuqlar, mualliflik stripslari, mazali souslar, burgerlar va butun oila uchun mo‘ljallangan to‘yimli boks kombolar.',
    rating: 4.83,
    phone: '+998712002211',
    hours: '10:00 - 02:00',
    baseUrl: 'https://evos-sandbox.shopla.uz',
    locations: [
      { id: 'fu-loc-qatortol', name: 'FeedUp Qatortol filiali', address: 'Toshkent sh., Chilonzor tumani, Qatortol ko‘chasi, 28-uy', lat: 41.288, lng: 69.214, radius: 10 },
      { id: 'fu-loc-sergeli', name: 'FeedUp Sergeli filiali', address: 'Toshkent sh., Sergeli tumani, Yangi Sergeli ko‘chasi', lat: 41.226, lng: 69.221, radius: 10 },
      { id: 'fu-loc-beruniy', name: 'FeedUp Beruniy filiali', address: 'Toshkent sh., Olmazor tumani, Beruniy shoh ko‘chasi', lat: 41.344, lng: 69.208, radius: 10 }
    ],
    offerings: [
      { id: 'fu-01', title: 'FeedUp Strips Qarsildoq (3 dona)', category: 'chicken', price: 22000, description: 'Original retsept asosida tayyorlangan yumshoq tovuq filesi stripslari.' },
      { id: 'fu-02', title: 'FeedUp Strips Qarsildoq (6 dona)', category: 'chicken', price: 39000, description: 'Katta porsiyadagi mayin tovuq go‘shti stripslari, sous bilan.' },
      { id: 'fu-03', title: 'FeedUp Achchiq Qanotlar Hot Wings (6 dona)', category: 'chicken', price: 34000, description: 'Maxsus o‘tkir panada qovurilgan karsillagan achchiq tovuq qanotlari.' },
      { id: 'fu-04', title: 'FeedUp Achchiq Qanotlar Hot Wings (12 dona)', category: 'chicken', price: 62000, description: 'Do‘stlar davrasi uchun katta porsiyadagi o‘tkir achchiq tovuq qanotlari.' },
      { id: 'fu-05', title: 'FeedUp Tovuq Oyoqchalari (Drumsticks 3 dona)', category: 'chicken', price: 36000, description: 'Tillarang qarsildoq qobig‘i ostidagi suvli tovuq oyoqchalari.' },
      { id: 'fu-06', title: 'Big Feed Burger Tovuqli', category: 'burgers', price: 32000, description: 'Qarsildoq tovuq stripslari, aysberg salat bargi, pomidor va maxsus oq sous.' },
      { id: 'fu-07', title: 'Feed Chizburger Strips bilan', category: 'burgers', price: 35000, description: 'Tovuq stripslari, qovurilgan Chedder pishlog‘i, tuzlangan bodring va sous.' },
      { id: 'fu-08', title: 'Barbeque Burger Mol go‘shtli', category: 'burgers', price: 37000, description: 'Suvli mol go‘shti kotleti, qovurilgan piyoz, dudlangan BBQ sous va salat.' },
      { id: 'fu-09', title: 'Tvister Roll Tovuqli (Standart)', category: 'rolls', price: 29000, description: 'Yupqa tortilyaga o‘ralgan issiq strips, pomidor, salat va sous.' },
      { id: 'fu-10', title: 'Tvister Roll Pishloqli (Cheese Twist)', category: 'rolls', price: 33000, description: 'Eritilgan Chedder pishlog‘i va stripslar bilan boyitilgan tvister.' },
      { id: 'fu-11', title: 'Mega Boks Kombo (Yakka o‘zi uchun to‘yimli)', category: 'combos', price: 52000, description: 'Big Feed burger, 2 dona strips, o‘rtacha fri va Coca-Cola 0.5L.' },
      { id: 'fu-12', title: 'Do‘stlar Katta Boksi (3-4 kishilik)', category: 'combos', price: 115000, description: '12 dona qanotcha, 6 dona strips, 2 ta katta fri va 2 ta Coca-Cola 0.5L.' },
      { id: 'fu-13', title: 'Feed Tovuq Naggetslari (6 dona)', category: 'snacks', price: 20000, description: 'Bolalar sevimli mayin qovurilgan tovuq naggetslari.' },
      { id: 'fu-14', title: 'Feed Tovuq Naggetslari (9 dona)', category: 'snacks', price: 28000, description: 'Katta porsiyadagi qarsildoq tovuq naggetslari.' },
      { id: 'fu-15', title: 'Kartoshka Fri (Katta porsiya)', category: 'fries', price: 19000, description: 'Maxsus sifatli kartoshkadan qovurilgan qarsildoq fri.' },
      { id: 'fu-16', title: 'Pishloqli Mozzarella tayoqchalari (4 dona)', category: 'snacks', price: 22000, description: 'Cho‘ziluvchan pishloq va qarsildoq panirka.' },
      { id: 'fu-17', title: 'Tsezar Salati Qarsildoq Tovuq bilan', category: 'salads', price: 29000, description: 'Aysberg barglari, cherri pomidori, suxariki, Parmezan va Tsezar sousi.' },
      { id: 'fu-18', title: 'Sweet Chili Sousi (Shirin-achchiq)', category: 'sauces', price: 5000, description: 'Tovuq stripslari bilan ajoyib mos tushuvchi osiyocha shirin-achchiq sous.' },
      { id: 'fu-19', title: 'Barbeque Dudlangan Sous', category: 'sauces', price: 5000, description: 'Dudlangan qalin klassik Amerika BBQ sousi.' },
      { id: 'fu-20', title: 'Pishloqli Chedder Sousi', category: 'sauces', price: 5000, description: 'Qaymoqli boy pishloq ta’miga ega sous.' },
      { id: 'fu-21', title: 'Fanta Orange 0.5L muzdek', category: 'beverages', price: 11000, description: 'Yorqin apelsin ta’miga ega salqin ichimlik.' }
    ].map(o => ({
      ...o,
      parametersSchema: {
        type: 'object',
        required: ['delivery_address', 'customer_phone'],
        properties: {
          delivery_address: { type: 'string', title: 'Yetkazib berish manzili' },
          apartment_or_office: { type: 'string', title: 'Xonadon / ofis raqami' },
          sauce_selection: { type: 'string', enum: ['Pishloqli sous', 'Barbeque sous', 'Sweet Chili sous', 'Sarimsoqli sous'], title: 'Qo‘shimcha sous tanlovi' },
          call_beforehand: { type: 'boolean', title: 'Yetib kelganda oldindan qo‘ng‘iroq qilish' },
          contactless_delivery: { type: 'boolean', title: 'Eshik oldida qoldirish (kontaktsiz yetkazish)' },
          customer_phone: { type: 'string', title: 'Bog‘lanish telefon raqami' }
        }
      }
    }))
  },

  // 22. DermaCare Estetik Markazi
  {
    slug: 'derma-care',
    name: 'DermaCare — Kosmetologiya va Estetik Dermatologiya',
    type: 'SERVICES',
    category: 'medical_health',
    description: 'Zamonaviy dermatologiya, tibbiy kosmetologiya, teri muammolarini davolash, lazer epilatsiyasi va yuz parvarishi bo‘yicha professional klinika.',
    rating: 4.93,
    phone: '+998712053344',
    hours: '09:00 - 20:00',
    baseUrl: 'https://evos-sandbox.shopla.uz',
    locations: [
      { id: 'dc-loc-shota', name: 'DermaCare Markaziy Klinikasi', address: 'Toshkent sh., Yakkasaroy tumani, Shota Rustaveli ko‘chasi, 65-uy', lat: 41.282, lng: 69.251, radius: 25 },
      { id: 'dc-loc-afrosiyob', name: 'DermaCare Mirobod filiali', address: 'Toshkent sh., Mirobod tumani, Afrosiyob ko‘chasi, 12-uy', lat: 41.302, lng: 69.268, radius: 20 }
    ],
    offerings: [
      { id: 'dc-01', title: 'Dermatolog-shifokor birlamchi konsultatsiyasi va ko‘rigi', category: 'consultation', price: 180000, description: 'Teri, soch va tirnoq muammolarini aniqlash, individual davolash rejasini tuzish.' },
      { id: 'dc-02', title: 'Raqamli Dermatoskopiya (Xol va pigment dog‘larni tekshirish)', category: 'diagnostic', price: 220000, description: 'Optik dermatoskop yordamida teri yangi hosilalarini xavfsizligini aniqlash.' },
      { id: 'dc-03', title: 'Yuz terisini apparatli chuqur tozalash (HydraFacial)', category: 'facial_care', price: 450000, description: 'Gidropiling, chuqur vakuumli tozalash, gialuron zardobi bilan oziqlantirish.' },
      { id: 'dc-04', title: 'Karbonli Lazer Pilingi (Qora qo‘g‘irchoq muolajasi)', category: 'laser', price: 380000, description: 'Karbon nano-geli va lazer nuri yordamida g‘ovaklarni toraytirish va terini yoshartirish.' },
      { id: 'dc-05', title: 'Akne va husnbuzarlarni kompleks davolash kursi (1 seans)', category: 'acne_treatment', price: 320000, description: 'Yallig‘lanishga qarshi dorivor tozalash va fototerapiya.' },
      { id: 'dc-06', title: 'Yuz terisi biorevitalizatsiyasi (Gialuron kislotasi)', category: 'injection', price: 850000, description: 'Fransiya/Italiya preparatlari bilan terining chuqur namlanishi va elastikligi.' },
      { id: 'dc-07', title: 'Plazmolifting (PRP Terapiya yuz uchun)', category: 'injection', price: 600000, description: 'Mijozning o‘z qonidan ajratilgan trombotsitlarga boy plazma bilan yoshartirish.' },
      { id: 'dc-08', title: 'Botulotoksin muolajasi (Peshana va ko‘z atrofi ajinlari)', category: 'injection', price: 750000, description: 'Mimik ajinlarni bartaraf qilish, sertifikatlangan Botoks preparati.' },
      { id: 'dc-09', title: 'Lab shaklini tabiiy korreksiya qilish (Gialuron fileri 1ml)', category: 'contour', price: 1300000, description: 'Lab hajmini tabiiy oshirish va simmetriyasini to‘g‘rilash.' },
      { id: 'dc-10', title: 'Yuz terisi mezoterapiyasi (Vitaminli kokteyl)', category: 'injection', price: 480000, description: 'Vitaminlar, peptidlar va minerallar majmuasi bilan terini jonlantirish.' },
      { id: 'dc-11', title: 'Lazer epilatsiyasi Aleksandrit (Butun vujud Total paket)', category: 'epilation', price: 850000, description: 'Candela GentleLase apparatida og‘riqsiz va samarali tuklardan tozalash.' },
      { id: 'dc-12', title: 'Lazer epilatsiyasi (Oyoqlar to‘liq + Qo‘ltiq osti)', category: 'epilation', price: 420000, description: 'Yozgi mavsum oldidan silliq teri uchun qulay paket.' },
      { id: 'dc-13', title: 'Lazer epilatsiyasi (Chuqur bikini zonasi)', category: 'epilation', price: 220000, description: 'Maxsus nozik teri uchun sovutish tizimli apparatda muolaja.' },
      { id: 'dc-14', title: 'Postakne va chandiqlarni fraksion CO2 lazerda silliqlash', category: 'laser', price: 700000, description: 'Chuqur izlar va chandiqlarni terining yangilanishi orqali tekislash.' },
      { id: 'dc-15', title: 'Yuz terisini ultratovushli tozalash (Ultrasonic Peeling)', category: 'facial_care', price: 250000, description: 'O‘lik teri hujayralarini yumshoq ko‘chirish va tozalash.' },
      { id: 'dc-16', title: 'Pigment dog‘lar va sepkillarni fototerapiyada yo‘qotish (IPL)', category: 'laser', price: 400000, description: 'Nur impulslari yordamida giperpigmentatsiyani samarali oqartirish.' },
      { id: 'dc-17', title: 'RF-Lifting (Radiochastotali terini taranglashtirish)', category: 'lifting', price: 390000, description: 'Kollagen ishlab chiqarilishini rag‘batlantirish va ikkinchi iyakni yo‘qotish.' },
      { id: 'dc-18', title: 'Yuzning plastik va limfodrenaj massaji (60 daqiqa)', category: 'massage', price: 240000, description: 'Shishlarni yo‘qotish, qon aylanishini yaxshilash va yuz ovalini ko‘tarish.' },
      { id: 'dc-19', title: 'Ko‘z osti qora halqalari va shishlarni mezoterapiyasi', category: 'injection', price: 350000, description: 'Ko‘z atrofi charchoqligini yo‘qotuvchi maxsus drenaj zardobi.' },
      { id: 'dc-20', title: 'Bosh terisi trixologik davolash (Soch to‘kilishiga qarshi PRP)', category: 'hair_care', price: 550000, description: 'Soch follikulalarini mustahkamlash va yangi soch o‘sishini faollashtirish.' },
      { id: 'dc-21', title: 'Glikol va bodom kislotali yengil kimyoviy piling', category: 'peeling', price: 280000, description: 'Terining rangini bir xillashtirish va mayin porlash berish.' }
    ].map(o => ({
      ...o,
      parametersSchema: {
        type: 'object',
        required: ['patient_name', 'preferred_date', 'time_slot', 'preferred_branch', 'phone'],
        properties: {
          patient_name: { type: 'string', title: 'Mijoz to‘liq ismi' },
          birth_year: { type: 'integer', title: 'Tug‘ilgan yili' },
          preferred_date: { type: 'string', title: 'Qabul sanasi (YYYY-MM-DD)' },
          time_slot: { type: 'string', enum: ['10:00 - 12:00', '13:00 - 15:00', '16:00 - 18:00', '18:00 - 20:00'], title: 'Ma’qul vaqt oralig‘i' },
          skin_concerns: { type: 'string', title: 'Asosiy shikoyat (akne, sepkil, ajin, tuklar)' },
          has_allergies: { type: 'boolean', title: 'Kosmetik vosita yoki dorilarga allergiya bormi' },
          preferred_branch: { type: 'string', enum: ['Shota Rustaveli klinikasi', 'Mirobod filiali'], title: 'Klinika filiali' },
          phone: { type: 'string', title: 'Bog‘lanish telefon raqami' }
        }
      }
    }))
  },

  // 23. SmartGadget Elektronika
  {
    slug: 'smart-gadget',
    name: 'SmartGadget — Smartfonlar va Elektronika Do‘koni',
    type: 'RETAIL',
    category: 'retail_electronics',
    description: 'Asl smartfonlar, planshetlar, noutbuklar, aqlli soatlar va maishiy texnika gadjetlari rasmiy kafolat bilan. Toshkent bo‘ylab 2 soatda yetkazib berish.',
    rating: 4.89,
    phone: '+998781291122',
    hours: '09:00 - 21:00',
    baseUrl: 'https://evos-sandbox.shopla.uz',
    locations: [
      { id: 'sg-loc-malika', name: 'SmartGadget Malika Markazi', address: 'Toshkent sh., Shayxontohur tumani, Malika A-24 do‘koni', lat: 41.341, lng: 69.263, radius: 25 },
      { id: 'sg-loc-sahiy', name: 'SmartGadget Abu Sahiy filiali', address: 'Toshkent sh., Chilonzor tumani, Abu Sahiy savdo majmuasi', lat: 41.248, lng: 69.167, radius: 25 }
    ],
    offerings: [
      { id: 'sg-01', title: 'Apple iPhone 15 Pro 128GB Natural Titanium', category: 'smartphones', price: 13200000, description: 'Titan korpus, A17 Pro chipi, 48MP kamera tizimi, 1 yillik rasmiy Apple kafolati.' },
      { id: 'sg-02', title: 'Apple iPhone 15 128GB Black (Dual SIM)', category: 'smartphones', price: 9800000, description: 'Dynamic Island, 48MP asosiy kamera, USB-C porti va ajoyib avtonomlik.' },
      { id: 'sg-03', title: 'Samsung Galaxy S24 Ultra 256GB Titanium Gray', category: 'smartphones', price: 13800000, description: 'Galaxy AI sun’iy intellekt xususiyatlari, 200MP kamera, S-Pen ruchkasi.' },
      { id: 'sg-04', title: 'Xiaomi 14 Ultra 512GB Leica Photography Kit bilan', category: 'smartphones', price: 12500000, description: 'Leica professional 1 dyuymli linzalari, Snapdragon 8 Gen 3, tezkor 90W zaryad.' },
      { id: 'sg-05', title: 'Apple MacBook Air 13-inch M3 8GB/256GB Space Gray', category: 'laptops', price: 13500000, description: 'M3 superchipli noutbuk, 18 soat batareya quvvati, yengil va shovqinsiz fan-less korpus.' },
      { id: 'sg-06', title: 'Apple iPad Air 11-inch M2 128GB Wi-Fi Starlight', category: 'tablets', price: 8400000, description: 'M2 protsessorli planshet, Liquid Retina displey, Apple Pencil Pro qo‘llab-quvvatlaydi.' },
      { id: 'sg-07', title: 'Apple AirPods Pro 2 (MagSafe USB-C keys bilan)', category: 'audio', price: 2700000, description: 'Faol shovqin so‘ndirish (ANC), shaffoflik rejimi, fazoviy audio va USB-C.' },
      { id: 'sg-08', title: 'Apple Watch Series 9 45mm GPS Midnight Alyuminiy', category: 'wearables', price: 4600000, description: 'Double tap imo-ishorasi, yorqin 2000 nit displey, puls va EKG datchiklari.' },
      { id: 'sg-09', title: 'Samsung Galaxy Watch 6 Classic 47mm Black', category: 'wearables', price: 3800000, description: 'Aylanuvchi mexanik bezel, qon bosimi va EKG o‘lchash, safir shisha.' },
      { id: 'sg-10', title: 'Xiaomi Robot Vacuum X10+ avtomatik tozalash stansiyali', category: 'smart_home', price: 6900000, description: 'Namlab va quruq tozalovchi robot-changyutgich, avtomat suv to‘ldirish va lattani yuvish.' },
      { id: 'sg-11', title: 'Dyson Supersonic fen (Special Gift Edition qutida)', category: 'beauty_gadgets', price: 5600000, description: 'Aqlli harorat nazorati, sochni kuydirmasdan tez qurituvchi 5 xil magnit uchlik.' },
      { id: 'sg-12', title: 'Marshall Stanmore III Bluetooth simsiz akustik kalonkasi', category: 'audio', price: 4400000, description: 'Afsonaviy Marshall rok-dizayni, chuqur baslar va xonani to‘ldiruvchi kuchli ovoz.' },
      { id: 'sg-13', title: 'Sony WH-1000XM5 shovqinni so‘ndiruvchi simsiz quloqchin', category: 'audio', price: 4100000, description: 'Dunyodagi eng ilg‘or faol shovqin so‘ndirish (Noise Cancelling), 30 soat batareya.' },
      { id: 'sg-14', title: 'Anker 737 PowerBank 24000mAh (PowerCore 140W)', category: 'power', price: 1250000, description: 'Noutbuk va telefonlarni bir vaqtda o‘ta tez quvvatlovchi aqlli ekranli powerbank.' },
      { id: 'sg-15', title: 'Baseus GaN5 Pro 100W tezkor zaryadlash adapteri', category: 'chargers', price: 420000, description: 'Kompakt GaN texnologiyali adapter, noutbuk, planshet va smartfon uchun universal.' },
      { id: 'sg-16', title: 'Apple MagSafe zaryadlovchi magnit kabeli 1m (Asl)', category: 'accessories', price: 490000, description: 'iPhone 12-15 seriyalari uchun 15W tezkor magnit simsiz quvvatlash.' },
      { id: 'sg-17', title: 'Ugreen USB-C to Lightning kabel MFi sertifikatlangan 1.5m', category: 'cables', price: 140000, description: 'To‘qilgan bardoshli sim, iPhone tezkor quvvatlash va kompyuterga ma’lumot uzatish.' },
      { id: 'sg-18', title: 'Belkin avtomobil ventilyatsiyasiga MagSafe ushlagichi', category: 'accessories', price: 380000, description: 'Kuchli magnitli xavfsiz telefon ushlagichi, 360 daraja burilish.' },
      { id: 'sg-19', title: 'SanDisk Extreme 1TB Portable SSD tashqi disk', category: 'storage', price: 1350000, description: 'Zarbalarga va suvga chidamli tezkor USB-C tashqi disk, video va fayllar uchun.' },
      { id: 'sg-20', title: 'Logitech MX Master 3S simsiz professional sichqoncha', category: 'peripherals', price: 1150000, description: 'Shovqinsiz klavishlar, elektromagnetik MagSpeed aylanmasi, 8K DPI datchik.' },
      { id: 'sg-21', title: 'Mijia Smart LED stol chirog‘i 1S (Wi-Fi va Apple HomeKit)', category: 'smart_home', price: 360000, description: 'Ko‘zni charchatmaydigan yorug‘lik, yorqinlik va haroratni mobil ilovada boshqarish.' }
    ].map(o => ({
      ...o,
      parametersSchema: {
        type: 'object',
        required: ['delivery_address', 'recipient_name', 'contact_phone'],
        properties: {
          delivery_address: { type: 'string', title: 'Yetkazib berish manzili' },
          recipient_name: { type: 'string', title: 'Qabul qiluvchi to‘liq ismi' },
          contact_phone: { type: 'string', title: 'Telefon raqami' },
          preferred_color: { type: 'string', title: 'Mahsulot rangi (masalan Qora, Oq, Titan)' },
          warranty_full_name: { type: 'string', title: 'Kafolat taloniga yoziladigan ism-familiya' },
          tax_code_for_imei: { type: 'string', title: 'IMEI ro‘yxatdan o‘tkazish uchun soliq/ro‘yxat kodi' },
          express_courier: { type: 'boolean', title: '2 soat ichida yetkazib berish kerakmi' }
        }
      }
    }))
  },

  // 24. Notarius va Rasmiy Tarjima Markazi
  {
    slug: 'notarius-express',
    name: 'Notarius Express — Notarius va Rasmiy Tarjima',
    type: 'SERVICES',
    category: 'legal_services',
    description: 'Hujjatlarni notarial tasdiqlash, apostil qo‘yish, konsullik legalizatsiyasi va 35 dan ortiq xorijiy tillarga professional tarjima xizmati.',
    rating: 4.97,
    phone: '+998712031010',
    hours: '09:00 - 18:00 (Dush-Shanba)',
    baseUrl: 'https://evos-sandbox.shopla.uz',
    locations: [
      { id: 'not-loc-adliya', name: 'Notarius va Tarjima Markaziy Ofisi', address: 'Toshkent sh., Mirzo Ulug‘bek tumani, Mustaqillik shoh ko‘chasi, 82-uy', lat: 41.325, lng: 69.308, radius: 25 },
      { id: 'not-loc-chilonzor', name: 'Notarius Chilonzor filiali', address: 'Toshkent sh., Chilonzor tumani, Bunyodkor shoh ko‘chasi, 23-uy', lat: 41.286, lng: 69.215, radius: 20 }
    ],
    offerings: [
      { id: 'not-01', title: 'Pasport nusxasini notarial tasdiqlash (Kopiya verna)', category: 'notary', price: 45000, description: 'O‘zbekiston yoki xorijiy pasport nusxasini qonuniy asl nusxaga tenglashtirib tasdiqlash.' },
      { id: 'not-02', title: 'Tug‘ilganlik haqida guvohnomani tarjima va notarial tasdiqlash', category: 'translation_notary', price: 140000, description: 'Rus, ingliz yoki boshqa tillarga tarjima qilib, notarius muhri bilan muhrlash.' },
      { id: 'not-03', title: 'Nikoh tuzilganligi haqida guvohnoma tarjimasi va tasdiqlash', category: 'translation_notary', price: 140000, description: 'Xorijga chiqish yoki viza markazlariga topshirish uchun rasmiy tasdiqlangan hujjat.' },
      { id: 'not-04', title: 'Diplom va baholar ilovasini ingliz tiliga rasmiy tarjima qilish', category: 'educational', price: 240000, description: 'Xorijiy universitetlar (AQSh, Buyuk Britaniya, Yevropa) uchun rasmiy ilmiy tarjima.' },
      { id: 'not-05', title: 'Diplom va ilovasini nemis tiliga tarjima va notarial tasdiqlash', category: 'educational', price: 260000, description: 'Germaniya va Avstriya elchixonalari va oliy o‘quv yurtlari talablariga muvofiq.' },
      { id: 'not-06', title: 'Ish joyidan ma’lumotnoma va daromadlar ma’lumotnomasini tarjima qilish', category: 'visa_docs', price: 90000, description: 'Elchixonalar uchun bank ko‘chirmasi va oylik maosh ma’lumotnomasini tarjimasi.' },
      { id: 'not-07', title: 'Sudlanganlik yo‘qligi to‘g‘risida ma’lumotnomaga Apostil qo‘yish', category: 'apostille', price: 280000, description: 'Gaaga konvensiyasiga a’zo 120 dan ortiq davlatlar uchun rasmiy Apostil shtampi.' },
      { id: 'not-08', title: 'Ta’lim hujjatlariga (Diplom, attestat) Apostil qo‘yish', category: 'apostille', price: 380000, description: 'Oliy va o‘rta maxsus ta’lim vazirligi orqali diplomning haqiqiyligini tasdiqlash.' },
      { id: 'not-09', title: 'FHDYo (ZAGS) guvohnomalariga rasmiy Apostil qo‘yish', category: 'apostille', price: 280000, description: 'Tug‘ilganlik, nikoh yoki ajrashganlik guvohnomalariga qonuniy shtamp bosish.' },
      { id: 'not-10', title: 'Avtotransportni boshqarish uchun ishonchnoma (General doverennost)', category: 'power_of_attorney', price: 180000, description: 'Avtomobilni tasarruf etish, haydash yoki sotish huquqi bilan notarial ishonchnoma.' },
      { id: 'not-11', title: 'Mol-mulk va ko‘chmas mulkni sotish / boshqarish ishonchnomasi', category: 'power_of_attorney', price: 220000, description: 'Xonadon yoki yer uchastkasini boshqarish bo‘yicha vakolat berish hujjati.' },
      { id: 'not-12', title: 'Voyaga yetmagan farzandni chet elga olib chiqish rozilik xati', category: 'consent_letter', price: 160000, description: 'Chegara xizmatlari va elchixonalar talab qiladigan rasmiy notarial rozilik arizasi.' },
      { id: 'not-13', title: 'Turar joy va kvartirani ijaraga berish shartnomasini notarial tasdiqlash', category: 'contracts', price: 250000, description: 'Ijara shartnomasini soliq organlari va qonunchilik talablari asosida tuzish.' },
      { id: 'not-14', title: 'Qarz shartnomasi va tilxatni notarial tasdiqlash', category: 'contracts', price: 290000, description: 'Fuqarolar o‘rtasidagi qarz munosabatlarini sud talablariga muvofiq qonuniy mustahkamlash.' },
      { id: 'not-15', title: 'Kompaniya Nizomi va Ta’sis hujjatlarini chet tiliga tarjima qilish', category: 'corporate', price: 65000, description: 'Yuridik atamalarga qat’iy rioya qilgan holda professional iqtisodiy tarjima.' },
      { id: 'not-16', title: 'Arab tiliga hujjatlar tarjimasi va elchixonalarga legalizatsiya', category: 'legalization', price: 450000, description: 'BAA, Saudiya Arabistoni, Qatar elchixonalari uchun TIV va Adliya orqali to‘liq legalizatsiya.' },
      { id: 'not-17', title: 'Xitoy tiliga rasmiy tarjima va Xitoy elchixonasi konsullik tasdig‘i', category: 'legalization', price: 520000, description: 'Xitoy Xalq Respublikasida amalda bo‘lishi uchun konsullik legalizatsiyasi.' },
      { id: 'not-18', title: 'Koreys tiliga hujjatlar tarjimasi va notarial tasdiqlash', category: 'translation_notary', price: 180000, description: 'Janubiy Koreyada o‘qish yoki ishlash vizasi uchun to‘liq hujjatlar paketi.' },
      { id: 'not-19', title: 'Ekspress 2 soatlik shoshilinch tarjima va tasdiqlash xizmati', category: 'urgent_service', price: 150000, description: 'Viza suhbati yoki uchrashuv oldidan eng tezkor tartibda bajarish.' },
      { id: 'not-20', title: 'Hujjatlarni kuryer orqali qabul qilib, tayyorini manzilga yetkazib berish', category: 'courier_service', price: 50000, description: 'Toshkent shahri bo‘ylab hujjatlarni uydan chiqmasdan topshirish va qabul qilish.' },
      { id: 'not-21', title: 'Merosga bo‘lgan huquq to‘g‘risida guvohnoma konsultatsiyasi', category: 'notary', price: 200000, description: 'Vasiyatnoma yoki qonun bo‘yicha merosni qabul qilish tartibi bo‘yicha yordam.' }
    ].map(o => ({
      ...o,
      parametersSchema: {
        type: 'object',
        required: ['client_name', 'document_type', 'source_lang', 'target_lang', 'phone'],
        properties: {
          client_name: { type: 'string', title: 'Mijoz to‘liq ismi (F.I.O)' },
          document_type: { type: 'string', title: 'Hujjat turi (Pasport, Diplom, Guvohnoma, Ishonchnoma)' },
          source_lang: { type: 'string', enum: ['O‘zbek tili', 'Rus tili', 'Ingliz tili', 'Boshqa til'], title: 'Hujjatning asl tili' },
          target_lang: { type: 'string', enum: ['Ingliz tili', 'Rus tili', 'Nemis tili', 'Arab tili', 'Turk tili', 'Koreys tili', 'Xitoy tili'], title: 'Qaysi tilga tarjima qilinadi' },
          needs_apostille: { type: 'boolean', title: 'Apostil shtampi kerakmi' },
          needs_notarization: { type: 'boolean', title: 'Notarius muhri kerakmi' },
          urgency: { type: 'string', enum: ['Standart (24 soat)', 'Ekspress (bugun 2-3 soatda)'], title: 'Tayyorlash tezligi' },
          delivery_address: { type: 'string', title: 'Tayyor hujjatni yetkazish manzili yoki Ofisdan olib ketish' },
          phone: { type: 'string', title: 'Telefon raqami' }
        }
      }
    }))
  },

  // 25. Fitness Hub Sport Markazi
  {
    slug: 'fitness-hub',
    name: 'Fitness Hub — Sport Zali, Basseyn va Trenajyor',
    type: 'SERVICES',
    category: 'sports_fitness',
    description: 'Zamonaviy trenajyor zali, 25 metrlik olimpiya suzish havzasi, fin saunasi, guruh mashg‘ulotlari va individual professional murabbiylar.',
    rating: 4.91,
    phone: '+998712078080',
    hours: '06:30 - 23:00',
    baseUrl: 'https://evos-sandbox.shopla.uz',
    locations: [
      { id: 'fh-loc-nukus', name: 'Fitness Hub Nukus Markazi', address: 'Toshkent sh., Mirobod tumani, Nukus ko‘chasi, 40-uy', lat: 41.294, lng: 69.276, radius: 20 },
      { id: 'fh-loc-navoiy', name: 'Fitness Hub Navoiy filiali', address: 'Toshkent sh., Shayxontohur tumani, Navoiy shoh ko‘chasi, 18-uy', lat: 41.324, lng: 69.248, radius: 20 }
    ],
    offerings: [
      { id: 'fh-01', title: '1 oylik zal abonenti Kunduzgi (07:00 - 17:00)', category: 'membership', price: 450000, description: 'Trenajyor zali, kardiomashinalar va dushdan kunduzgi qulay vaqtda cheksiz foydalanish.' },
      { id: 'fh-02', title: '1 oylik To‘liq zal abonenti (Kun bo‘yi 06:30 - 23:00)', category: 'membership', price: 650000, description: 'Cheksiz tashrif, trenajyor zali, krossfit zonasi va sauna.' },
      { id: 'fh-03', title: '3 oylik Cheksiz abonent (+15 kun muzlatish huquqi bilan)', category: 'membership', price: 1650000, description: 'Barcha zonalarga kirish, dastlabki InBody tahlili va shaxsiy shkafcha.' },
      { id: 'fh-04', title: '6 oylik VIP Abonent (+30 kun muzlatish bilan)', category: 'membership', price: 2900000, description: 'Cheksiz trenajyor, basseyn, fin saunasi va 2 ta bepul murabbiy mashg‘uloti.' },
      { id: 'fh-05', title: '1 yillik Platinum VIP Abonent (To‘liq cheksiz barcha zonalar)', category: 'membership', price: 5200000, description: 'Yil davomida cheksiz fitness, basseyn, xamom, 60 kun muzlatish va mehmon taklifnomalari.' },
      { id: 'fh-06', title: 'Suzish havzasi (Basseyn) uchun 1 oylik abonent (12 ta kirish)', category: 'swimming', price: 550000, description: '25 metrlik zamonaviy tozalash tizimiga ega olimpiya suzish havzasi va sauna.' },
      { id: 'fh-07', title: 'Suzish bo‘yicha 1 oylik cheksiz abonent', category: 'swimming', price: 750000, description: 'Har kuni xohlagan vaqtda basseyn va gidromassaj zonasidan foydalanish.' },
      { id: 'fh-08', title: 'Shaxsiy professional murabbiy bilan 10 ta individual mashg‘ulot', category: 'personal_training', price: 1200000, description: 'Vazn tashlash yoki mushak o‘stirish bo‘yicha qat’iy nazorat va to‘g‘ri texnika.' },
      { id: 'fh-09', title: 'Shaxsiy murabbiy bilan 20 ta individual mashg‘ulot kursi', category: 'personal_training', price: 2100000, description: 'To‘liq transformatsiya kursi, haftalik natijalar monitoringi.' },
      { id: 'fh-10', title: 'Bolalar uchun suzish bo‘yicha guruh mashg‘ulotlari (oylik 12 dars)', category: 'kids_sports', price: 490000, description: 'Tajribali murabbiy nazorati ostida noldan suzishni o‘rganish va chiniqish.' },
      { id: 'fh-11', title: 'Ayollar uchun guruhli Pilates va Stretching mashg‘ulotlari', category: 'group_classes', price: 480000, description: 'Qaddi-qomatni to‘g‘rilash, egiluvchanlikni oshirish va bel og‘riqlaridan xalos bo‘lish.' },
      { id: 'fh-12', title: 'Guruhli Yoga va nafas mashqlari kursi (oylik 12 dars)', category: 'group_classes', price: 460000, description: 'Tinchlanish, stressni yengish va tanani mustahkamlash mashg‘ulotlari.' },
      { id: 'fh-13', title: 'Krossfit va yuqori intensivlikdagi intervalli mashg‘ulotlar (HIIT)', category: 'group_classes', price: 490000, description: 'Chidamlilik, quvvat va kaloriyalarni tez yo‘qotish bo‘yicha jadal guruh darsi.' },
      { id: 'fh-14', title: 'Boks va kikkboksing bo‘yicha mashg‘ulotlar (oylik)', category: 'combat', price: 500000, description: 'Himoyalanish texnikasi, tezkorlik va jismoniy quvvatni rivojlantirish.' },
      { id: 'fh-15', title: 'InBody tana tarkibini kompyuterda aniq tahlil qilish', category: 'diagnostics', price: 120000, description: 'Mushak, yog‘, suv massasi va metabolizm tezligini ko‘rsatuvchi tahliliy hisobot.' },
      { id: 'fh-16', title: 'Individual sport ovqatlanish ratsionini tuzish (Dietolog maslahati)', category: 'nutrition', price: 250000, description: 'Kaloriya hisoblangan oylik taomnomalar menyusi.' },
      { id: 'fh-17', title: 'Sport tiklanish massaji (Umumiy tana, 60 daqiqa)', category: 'massage', price: 250000, description: 'Mashg‘ulotdan so‘ng mushaklardagi kislotani haydash va dam oldirish.' },
      { id: 'fh-18', title: 'Shvetsiya relaks massaji (60 daqiqa)', category: 'massage', price: 220000, description: 'Umumiy charchoqni chiqaruvchi xushbo‘y efir moyli yoqimli massaj.' },
      { id: 'fh-19', title: 'Fin saunasi va turk xamomi (Bir martalik kirish)', category: 'spa', price: 90000, description: 'Issiq bug‘, toshli sauna va relaks zonasi.' },
      { id: 'fh-20', title: 'Shaxsiy yechinish shkafi (1 oylik doimiy shaxsiy ijara)', category: 'amenities', price: 150000, description: 'O‘z buyumlari va sport kiyimlarini xavfsiz qoldirish uchun maxsus qulflanuvchi shkaf.' },
      { id: 'fh-21', title: 'Fitnes-bardagi oylik Protein va BCAA smuzi to‘plami (20 ta)', category: 'fitness_bar', price: 450000, description: 'Mashg‘ulotdan so‘ng oqsilli shirin kokteyllar bilan quvvatni tiklash.' }
    ].map(o => ({
      ...o,
      parametersSchema: {
        type: 'object',
        required: ['member_full_name', 'phone', 'preferred_branch', 'start_date', 'primary_goal'],
        properties: {
          member_full_name: { type: 'string', title: 'A’zo bo‘luvchi F.I.O' },
          phone: { type: 'string', title: 'Telefon raqami' },
          birth_date: { type: 'string', title: 'Tug‘ilgan sana (YYYY-MM-DD)' },
          gender: { type: 'string', enum: ['Erkak', 'Ayol'], title: 'Jinsi' },
          preferred_branch: { type: 'string', enum: ['Nukus filiali', 'Navoiy filiali'], title: 'Qaysi filial qulay' },
          start_date: { type: 'string', title: 'A’zolik boshlanish sanasi' },
          primary_goal: { type: 'string', enum: ['Vazn tashlash (Ozish)', 'Mushak chiqarish', 'Suzishni o‘rganish', 'Salomatlik va tonus'], title: 'Asosiy maqsad' },
          has_health_issues: { type: 'boolean', title: 'Umurtqa yoki yurak bo‘yicha shifokor cheklovlari bormi' }
        }
      }
    }))
  }
];
