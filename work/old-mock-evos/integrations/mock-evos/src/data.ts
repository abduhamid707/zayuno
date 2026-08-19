export interface EvosBranch {
  branch_code: string;
  title: string;
  location_address: string;
  lat: number;
  lng: number;
  open_at: string;
  close_at: string;
  coverage_km: number;
  is_open: boolean;
}

export interface EvosModifier {
  mod_id: string;
  title: string;
  extra_cost: number;
  is_default?: boolean;
}

export interface EvosModifierGroup {
  group_id: string;
  title: string;
  min_select: number;
  max_select: number;
  required: boolean;
  options: EvosModifier[];
}

export interface EvosVariant {
  var_id: string;
  title: string;
  price: number;
  is_default?: boolean;
}

export interface EvosProduct {
  evos_id: string;
  title: string;
  desc: string;
  cat_code: string;
  img: string;
  cost: number;
  in_stock: boolean;
  variants?: EvosVariant[];
  modifier_groups?: EvosModifierGroup[];
  labels?: string[];
}

export interface EvosCategory {
  cat_code: string;
  title: string;
  display_order: number;
  img?: string;
}

export const EVOS_BRANCHES: EvosBranch[] = [
  {
    branch_code: 'evos_branch_chilonzor_1',
    title: 'EVOS Chilonzor (Qatortol)',
    location_address: 'Toshkent sh., Chilonzor tumani, Qatortol ko‘chasi, 28',
    lat: 41.2825,
    lng: 69.2145,
    open_at: '09:00',
    close_at: '03:00',
    coverage_km: 8.0,
    is_open: true
  },
  {
    branch_code: 'evos_branch_yunusobod_1',
    title: 'EVOS Yunusobod 11-kvartal',
    location_address: 'Toshkent sh., Yunusobod tumani, Ahmad Donish ko‘chasi, 45',
    lat: 41.3654,
    lng: 69.2891,
    open_at: '09:00',
    close_at: '02:00',
    coverage_km: 7.5,
    is_open: true
  },
  {
    branch_code: 'evos_branch_mirzo_ulugbek_1',
    title: 'EVOS Buyuk Ipak Yo‘li (Gorkiy)',
    location_address: 'Toshkent sh., Mirzo Ulug‘bek tumani, Buyuk Ipak Yo‘li ko‘chasi, 112',
    lat: 41.3262,
    lng: 69.3289,
    open_at: '09:00',
    close_at: '03:00',
    coverage_km: 9.0,
    is_open: true
  },
  {
    branch_code: 'evos_branch_oybek_1',
    title: 'EVOS Oybek (Shahrisabz)',
    location_address: 'Toshkent sh., Mirobod tumani, Oybek ko‘chasi, 14',
    lat: 41.2988,
    lng: 69.2783,
    open_at: '08:00',
    close_at: '04:00',
    coverage_km: 6.0,
    is_open: true
  },
  {
    branch_code: 'evos_branch_beruniy_1',
    title: 'EVOS Beruniy Metro',
    location_address: 'Toshkent sh., Olmazor tumani, Beruniy shoh ko‘chasi, 3',
    lat: 41.3441,
    lng: 69.2081,
    open_at: '09:00',
    close_at: '01:00',
    coverage_km: 8.0,
    is_open: true
  }
];

export const EVOS_CATEGORIES: EvosCategory[] = [
  { cat_code: 'sets', title: 'Setlar va Kombolar', display_order: 1 },
  { cat_code: 'lavash', title: 'Lavashlar', display_order: 2 },
  { cat_code: 'burger', title: 'Burgerlar va Donarlar', display_order: 3 },
  { cat_code: 'drinks', title: 'Ichimliklar', display_order: 4 },
  { cat_code: 'sauces', title: 'Souslar va Qo‘shimchalar', display_order: 5 }
];

const STANDARD_LAVASH_MODIFIERS: EvosModifierGroup[] = [
  {
    group_id: 'lavash_extras',
    title: 'Qo‘shimcha masalliqlar',
    min_select: 0,
    max_select: 3,
    required: false,
    options: [
      { mod_id: 'extra_cheese', title: 'Qo‘shimcha pishloq (Extra Cheese)', extra_cost: 4000 },
      { mod_id: 'no_onion', title: 'Piyozsiz (Without Onion)', extra_cost: 0, is_default: false },
      { mod_id: 'extra_meat', title: 'Qo‘shimcha go‘sht', extra_cost: 9000 },
      { mod_id: 'jalapeno', title: 'Achchiq xalapeno qalampiri', extra_cost: 3000 }
    ]
  },
  {
    group_id: 'sauce_option',
    title: 'Sous turi',
    min_select: 0,
    max_select: 1,
    required: false,
    options: [
      { mod_id: 'garlic_sauce', title: 'Chesnokli sous', extra_cost: 0, is_default: true },
      { mod_id: 'spicy_sauce', title: 'Achchiq sous', extra_cost: 0 }
    ]
  }
];

export const EVOS_PRODUCTS: EvosProduct[] = [
  // --- SETS ---
  {
    evos_id: 'evos_set_x',
    title: 'X Set',
    desc: 'Original Lavash (mol go‘shti), Kartoshka Fri va 0.5L muzdek Coca-Cola.',
    cat_code: 'sets',
    img: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=500&auto=format&fit=crop&q=60',
    cost: 59000,
    in_stock: true,
    variants: [
      { var_id: 'beef', title: 'Mol go‘shti bilan', price: 59000, is_default: true },
      { var_id: 'chicken', title: 'Tovuq go‘shti bilan', price: 54000 }
    ],
    modifier_groups: STANDARD_LAVASH_MODIFIERS,
    labels: ['HIT', 'BESTSELLER']
  },
  {
    evos_id: 'evos_set_family',
    title: 'Family Set',
    desc: '3 ta Standart Lavash, 2 ta Katta Fri, 1 ta Coca-Cola 1.5L va 3 ta sous.',
    cat_code: 'sets',
    img: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=500&auto=format&fit=crop&q=60',
    cost: 165000,
    in_stock: true,
    labels: ['FAMILY', 'SAVE_20%']
  },
  {
    evos_id: 'evos_set_combo',
    title: 'Combo Set Burger',
    desc: 'Classic Burger, Kartoshka Fri va 0.5L Coca-Cola.',
    cat_code: 'sets',
    img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=60',
    cost: 52000,
    in_stock: true,
    labels: ['COMBO']
  },

  // --- LAVASH ---
  {
    evos_id: 'evos_lavash_original',
    title: 'Original Lavash',
    desc: 'Yupqa xamir, saralangan go‘sht, qarsildoq bodring, pomidor, maxsus pomidor va chesnokli sous.',
    cat_code: 'lavash',
    img: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=500&auto=format&fit=crop&q=60',
    cost: 36000,
    in_stock: true,
    variants: [
      { var_id: 'standard', title: 'Standart (Mol go‘shti)', price: 36000, is_default: true },
      { var_id: 'big', title: 'Katta (Big Beef)', price: 44000 },
      { var_id: 'chicken_std', title: 'Standart (Tovuqli)', price: 32000 }
    ],
    modifier_groups: STANDARD_LAVASH_MODIFIERS,
    labels: ['CLASSIC']
  },
  {
    evos_id: 'evos_lavash_mini',
    title: 'Mini Lavash',
    desc: 'Kichikroq porsiyadagi mazali original lavash.',
    cat_code: 'lavash',
    img: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=500&auto=format&fit=crop&q=60',
    cost: 27000,
    in_stock: true,
    modifier_groups: STANDARD_LAVASH_MODIFIERS
  },
  {
    evos_id: 'evos_lavash_cheese',
    title: 'Cheese Lavash (Pishloqli)',
    desc: 'Yumshoq erigan Golland va Mozzarella pishloqlari bilan to‘ldirilgan original lavash.',
    cat_code: 'lavash',
    img: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=500&auto=format&fit=crop&q=60',
    cost: 41000,
    in_stock: true,
    variants: [
      { var_id: 'beef_cheese', title: 'Mol go‘shti va pishloq', price: 41000, is_default: true },
      { var_id: 'chicken_cheese', title: 'Tovuq go‘shti va pishloq', price: 37000 }
    ],
    modifier_groups: STANDARD_LAVASH_MODIFIERS,
    labels: ['CHEESY']
  },

  // --- BURGERS ---
  {
    evos_id: 'evos_burger_classic',
    title: 'Classic Burger',
    desc: 'Yumshoq bulochka, shirali go‘shtli kotlet, bodring, pomidor, aysberg va maxsus burger sousi.',
    cat_code: 'burger',
    img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=60',
    cost: 29000,
    in_stock: true,
    modifier_groups: [
      {
        group_id: 'burger_options',
        title: 'Burger qo‘shimchalari',
        min_select: 0,
        max_select: 2,
        required: false,
        options: [
          { mod_id: 'cheddar_slice', title: 'Cheddar pishlog‘i', extra_cost: 3500 },
          { mod_id: 'no_onion', title: 'Piyozsiz', extra_cost: 0 }
        ]
      }
    ]
  },
  {
    evos_id: 'evos_burger_double',
    title: 'Double Burger',
    desc: '2 ta go‘shtli kotlet, erigan pishloq va yangi sabzavotlar.',
    cat_code: 'burger',
    img: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=500&auto=format&fit=crop&q=60',
    cost: 43000,
    in_stock: true
  },
  {
    evos_id: 'evos_burger_chicken',
    title: 'Chicken Burger',
    desc: 'Qarsildoq tovuq filesi, aysberg va mayonez sousi.',
    cat_code: 'burger',
    img: 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?w=500&auto=format&fit=crop&q=60',
    cost: 26000,
    in_stock: true
  },

  // --- DRINKS ---
  {
    evos_id: 'evos_drink_cola_05',
    title: 'Coca-Cola 0.5L',
    desc: 'Muzdek tetiklantiruvchi gazlangan ichimlik.',
    cat_code: 'drinks',
    img: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=60',
    cost: 9000,
    in_stock: true
  },
  {
    evos_id: 'evos_drink_cola_10',
    title: 'Coca-Cola 1.0L',
    desc: 'Katta hajmdagi Coca-Cola.',
    cat_code: 'drinks',
    img: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=60',
    cost: 15000,
    in_stock: true
  },
  {
    evos_id: 'evos_drink_fanta_05',
    title: 'Fanta 0.5L',
    desc: 'Apelsin ta’mli gazlangan ichimlik.',
    cat_code: 'drinks',
    img: 'https://images.unsplash.com/photo-1624517452488-04869289c4ca?w=500&auto=format&fit=crop&q=60',
    cost: 9000,
    in_stock: true
  },
  {
    evos_id: 'evos_drink_sprite_05',
    title: 'Sprite 0.5L',
    desc: 'Laym va limon ta’mli ichimlik.',
    cat_code: 'drinks',
    img: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=500&auto=format&fit=crop&q=60',
    cost: 9000,
    in_stock: true
  },
  {
    evos_id: 'evos_drink_ayran',
    title: 'Ayran 0.3L',
    desc: 'Tabiiy milliy yaxna sut mahsuloti.',
    cat_code: 'drinks',
    img: 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=500&auto=format&fit=crop&q=60',
    cost: 6000,
    in_stock: true
  },

  // --- SAUCES ---
  {
    evos_id: 'evos_sauce_cheese',
    title: 'Pishloqli sous (Cheese Sauce)',
    desc: 'Mayin pishloq sousi.',
    cat_code: 'sauces',
    img: 'https://images.unsplash.com/photo-1472476443507-c7a5948772fc?w=500&auto=format&fit=crop&q=60',
    cost: 4000,
    in_stock: true
  },
  {
    evos_id: 'evos_sauce_garlic',
    title: 'Chesnokli sous (Garlic Sauce)',
    desc: 'Xushbo‘y chesnokli klassik sous.',
    cat_code: 'sauces',
    img: 'https://images.unsplash.com/photo-1472476443507-c7a5948772fc?w=500&auto=format&fit=crop&q=60',
    cost: 4000,
    in_stock: true
  },
  {
    evos_id: 'evos_sauce_chili',
    title: 'Achchiq sous (Chili Sauce)',
    desc: 'O‘tkir qizil qalampirli sous.',
    cat_code: 'sauces',
    img: 'https://images.unsplash.com/photo-1472476443507-c7a5948772fc?w=500&auto=format&fit=crop&q=60',
    cost: 4000,
    in_stock: true
  }
];
