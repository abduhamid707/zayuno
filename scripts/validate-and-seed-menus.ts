import fs from 'fs';
import path from 'path';
import {
  OfferingSchema,
  CatalogCategorySchema,
  isSafePublicHttpsUrl
} from '@zayuno/contracts';

function cleanHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

export function loadAndFormatAllMenus() {
  const providersData: any[] = [];

  // 1. Bellissimo
  const belRaw = JSON.parse(fs.readFileSync('data/menus/bellissimo-menu.json', 'utf8'));
  const belOfferings: any[] = [];
  const belCategories: any[] = [];

  belRaw.categories.forEach((cat: any, cIdx: number) => {
    const catSlug = cat.slug || `bel-cat-${cIdx + 1}`;
    const catTitle = cat.title?.uz || cat.title?.ru || 'Pitsalar';
    belCategories.push({
      id: `bel-cat-${cIdx + 1}`,
      slug: catSlug,
      title: catTitle,
      description: cat.title?.ru || null,
      displayOrder: cIdx + 1,
      offeringsCount: cat.items.length
    });

    cat.items.forEach((item: any, iIdx: number) => {
      const title = item.name?.uz || item.name?.ru || 'Pitsa';
      const desc = cleanHtml(item.description?.uz || item.description?.ru || '');
      const img = item.image && isSafePublicHttpsUrl(item.image) ? item.image : null;
      const id = `bel-${item.id || cIdx + '_' + iIdx}`;

      const variants = Array.isArray(item.variants)
        ? item.variants.map((v: any) => ({
            id: v.id,
            name: v.nameUz || v.nameRu || v.name || 'Variant',
            price: Number(v.price) || 0,
            imageUrl: v.image || null,
          }))
        : [];
      const resolvedBasePrice =
        Number(item.basePrice || item.price) ||
        (variants.length > 0 ? variants[0].price : 0);

      belOfferings.push({
        id,
        providerId: 'bellissimo',
        offeringCode: `BEL-${(iIdx + 1).toString().padStart(3, '0')}`,
        title,
        description: desc || null,
        categorySlug: catSlug,
        categoryTitle: catTitle,
        imageUrl: img,
        media: img ? [{ url: img, altText: title, order: 0 }] : [],
        basePrice: resolvedBasePrice,
        currency: 'UZS',
        isAvailable: true,
        variants,
        optionGroups: [],
        tags: ['pizza', 'bellissimo', catSlug],
        metadata: {
          originalPrice: item.originalPrice,
          discountPercent: item.discountPercent,
          nameRu: item.name?.ru
        }
      });
    });
  });

  providersData.push({
    slug: 'bellissimo',
    name: 'Bellissimo Pizza',
    logoUrl: 'https://io.bellissimo.uz/images/03650000-6bec-ac1f-05ef-08db9f189c3d.jpg',
    description: 'Bellissimo Pizza — O‘zbekistondagi eng mashhur pitsaxona tarmog‘i. Issiq pitsalar, gazaklar, kombolar va shirinliklar.',
    categories: belCategories,
    offerings: belOfferings,
    locations: [
      {
        providerLocationId: 'bel-loc-chilonzor',
        name: 'Bellissimo Pizza — Chilonzor',
        address: 'Toshkent sh., Chilonzor tumani, Qatortol ko‘chasi 28',
        latitude: 41.2858,
        longitude: 69.2045,
        operatingHours: { open: '10:00', close: '03:00', days: [1, 2, 3, 4, 5, 6, 7] },
        serviceRadiusKm: 10.0
      },
      {
        providerLocationId: 'bel-loc-yunusobod',
        name: 'Bellissimo Pizza — Yunusobod',
        address: 'Toshkent sh., Yunusobod tumani, Amir Temur shoh ko‘chasi 45',
        latitude: 41.3645,
        longitude: 69.2878,
        operatingHours: { open: '10:00', close: '03:00', days: [1, 2, 3, 4, 5, 6, 7] },
        serviceRadiusKm: 10.0
      },
      {
        providerLocationId: 'bel-loc-mirzo-ulugbek',
        name: 'Bellissimo Pizza — Buyuk Ipak Yo‘li',
        address: 'Toshkent sh., Mirzo Ulug‘bek tumani, Buyuk Ipak Yo‘li ko‘chasi 112',
        latitude: 41.3262,
        longitude: 69.3285,
        operatingHours: { open: '10:00', close: '03:00', days: [1, 2, 3, 4, 5, 6, 7] },
        serviceRadiusKm: 10.0
      },
      {
        providerLocationId: 'bel-loc-mirobod',
        name: 'Bellissimo Pizza — Oybek',
        address: 'Toshkent sh., Mirobod tumani, Oybek ko‘chasi 24',
        latitude: 41.2985,
        longitude: 69.2789,
        operatingHours: { open: '10:00', close: '03:00', days: [1, 2, 3, 4, 5, 6, 7] },
        serviceRadiusKm: 10.0
      }
    ]
  });

  // 2. EVOS
  const evosRaw = JSON.parse(fs.readFileSync('data/menus/evos-menu.json', 'utf8'));
  const evosOfferings: any[] = [];
  const evosCategories: any[] = [];

  evosRaw.categories.forEach((cat: any, cIdx: number) => {
    const catSlug = cat.slug || `evos-cat-${cIdx + 1}`;
    const catTitle = cat.title?.uz || cat.title?.ru || 'Fast Food';
    evosCategories.push({
      id: `evos-cat-${cIdx + 1}`,
      slug: catSlug,
      title: catTitle,
      description: cat.title?.ru || null,
      displayOrder: cIdx + 1,
      offeringsCount: cat.items.length
    });

    cat.items.forEach((item: any, iIdx: number) => {
      const title = item.name?.uz || item.name?.ru || 'Taom';
      const desc = cleanHtml(item.description?.uz || item.description?.ru || '');
      const img = item.image && isSafePublicHttpsUrl(item.image) ? item.image : null;
      const id = `evos-${item.id || cIdx + '_' + iIdx}`;

      const optionGroups: any[] = [];
      if (Array.isArray(item.modifiers) && item.modifiers.length > 0) {
        optionGroups.push({
          id: 'mods',
          name: 'Tarkibi / Variantlari',
          minSelections: 0,
          maxSelections: item.modifiers.length,
          isRequired: false,
          options: item.modifiers.map((m: any, mIdx: number) => ({
            id: `mod-${mIdx + 1}`,
            name: m.name,
            priceDelta: Number(m.price) || 0,
            isDefault: false,
            isAvailable: true,
            metadata: {}
          }))
        });
      }

      evosOfferings.push({
        id,
        providerId: 'evos',
        offeringCode: item.code || `EVOS-${(iIdx + 1).toString().padStart(3, '0')}`,
        title,
        description: desc || null,
        categorySlug: catSlug,
        categoryTitle: catTitle,
        imageUrl: img,
        media: img ? [{ url: img, altText: title, order: 0 }] : [],
        basePrice: Number(item.price) || 0,
        currency: 'UZS',
        isAvailable: true,
        variants: [],
        optionGroups,
        tags: ['evos', 'fastfood', 'lavash', catSlug],
        metadata: {
          code: item.code,
          nameRu: item.name?.ru
        }
      });
    });
  });

  providersData.push({
    slug: 'evos',
    name: 'EVOS Fast Food',
    logoUrl: 'https://16a9564f-f8ec-42ba-a998-3027aa809e50.selstorage.ru/evos/72611/30864/images/items/5a32a682e6503452c9fa57317ae0666e.PNG',
    description: 'EVOS — O‘zbekistondagi 1-raqamli milliy fast-fud tarmog‘i. Mazali lavash, shaurma, burger va kombo taomlar.',
    categories: evosCategories,
    offerings: evosOfferings,
    locations: [
      {
        providerLocationId: 'evos-loc-chilonzor',
        name: 'EVOS — Chilonzor',
        address: 'Toshkent sh., Chilonzor tumani, Muqimiy ko‘chasi 15',
        latitude: 41.2815,
        longitude: 69.2140,
        operatingHours: { open: '08:00', close: '02:00', days: [1, 2, 3, 4, 5, 6, 7] },
        serviceRadiusKm: 10.0
      },
      {
        providerLocationId: 'evos-loc-yunusobod',
        name: 'EVOS — Yunusobod Megaplanet',
        address: 'Toshkent sh., Yunusobod tumani, Ahmad Donish ko‘chasi 2B',
        latitude: 41.3665,
        longitude: 69.2890,
        operatingHours: { open: '08:00', close: '02:00', days: [1, 2, 3, 4, 5, 6, 7] },
        serviceRadiusKm: 10.0
      },
      {
        providerLocationId: 'evos-loc-shayxontohur',
        name: 'EVOS — Chorsu',
        address: 'Toshkent sh., Shayxontohur tumani, Beruniy ko‘chasi 4',
        latitude: 41.3245,
        longitude: 69.2395,
        operatingHours: { open: '08:00', close: '02:00', days: [1, 2, 3, 4, 5, 6, 7] },
        serviceRadiusKm: 10.0
      },
      {
        providerLocationId: 'evos-loc-sergeli',
        name: 'EVOS — Sergeli',
        address: 'Toshkent sh., Sergeli tumani, Yangi Sergeli ko‘chasi 18',
        latitude: 41.2255,
        longitude: 69.2185,
        operatingHours: { open: '08:00', close: '02:00', days: [1, 2, 3, 4, 5, 6, 7] },
        serviceRadiusKm: 10.0
      }
    ]
  });

  // 3. MaxWay
  const mwRaw = JSON.parse(fs.readFileSync('data/menus/maxway-menu.json', 'utf8'));
  const mwOfferings: any[] = [];
  const mwCategories: any[] = [];

  mwRaw.categories.forEach((cat: any, cIdx: number) => {
    const catSlug = cat.slug || `mw-cat-${cIdx + 1}`;
    const catTitle = cat.title?.uz || cat.title?.ru || 'Fast Food';
    mwCategories.push({
      id: `mw-cat-${cIdx + 1}`,
      slug: catSlug,
      title: catTitle,
      description: cat.title?.ru || null,
      displayOrder: cIdx + 1,
      offeringsCount: cat.items.length
    });

    cat.items.forEach((item: any, iIdx: number) => {
      const title = item.name?.uz || item.name?.ru || 'Taom';
      const desc = cleanHtml(item.description?.uz || item.description?.ru || '');
      const img = item.image && isSafePublicHttpsUrl(item.image) ? item.image : null;
      const id = `mw-${item.id || cIdx + '_' + iIdx}`;

      mwOfferings.push({
        id,
        providerId: 'maxway',
        offeringCode: item.code || `MW-${(iIdx + 1).toString().padStart(3, '0')}`,
        title,
        description: desc || null,
        categorySlug: catSlug,
        categoryTitle: catTitle,
        imageUrl: img,
        media: img ? [{ url: img, altText: title, order: 0 }] : [],
        basePrice: Number(item.price) || 0,
        currency: 'UZS',
        isAvailable: true,
        variants: [],
        optionGroups: [],
        tags: ['maxway', 'fastfood', 'burger', catSlug],
        metadata: {
          code: item.code,
          weight: item.weight,
          nameRu: item.name?.ru
        }
      });
    });
  });

  providersData.push({
    slug: 'maxway',
    name: 'MaxWay Fast Food',
    logoUrl: 'https://cdn.delever.uz/delever/c3684082-16ac-46b1-bbac-29549bcd29e7',
    description: 'MaxWay — Tez va to‘yimli fast-fud tarmog‘i. Katta burgerlar, klabb-lavashlar, tovuq qanotlari va sneklar.',
    categories: mwCategories,
    offerings: mwOfferings,
    locations: [
      {
        providerLocationId: 'mw-loc-chilonzor',
        name: 'MaxWay — Chilonzor',
        address: 'Toshkent sh., Chilonzor tumani, Qatortol ko‘chasi 10',
        latitude: 41.2840,
        longitude: 69.2080,
        operatingHours: { open: '09:00', close: '03:00', days: [1, 2, 3, 4, 5, 6, 7] },
        serviceRadiusKm: 10.0
      },
      {
        providerLocationId: 'mw-loc-novza',
        name: 'MaxWay — Novza',
        address: 'Toshkent sh., Chilonzor tumani, Muqimiy ko‘chasi 44',
        latitude: 41.2885,
        longitude: 69.2295,
        operatingHours: { open: '09:00', close: '03:00', days: [1, 2, 3, 4, 5, 6, 7] },
        serviceRadiusKm: 10.0
      },
      {
        providerLocationId: 'mw-loc-beruniy',
        name: 'MaxWay — Beruniy',
        address: 'Toshkent sh., Olmazor tumani, Beruniy ko‘chasi 35A',
        latitude: 41.3430,
        longitude: 69.2085,
        operatingHours: { open: '09:00', close: '03:00', days: [1, 2, 3, 4, 5, 6, 7] },
        serviceRadiusKm: 10.0
      },
      {
        providerLocationId: 'mw-loc-yunusobod',
        name: 'MaxWay — Yunusobod',
        address: 'Toshkent sh., Yunusobod tumani, Amir Temur shoh ko‘chasi 95',
        latitude: 41.3550,
        longitude: 69.2860,
        operatingHours: { open: '09:00', close: '03:00', days: [1, 2, 3, 4, 5, 6, 7] },
        serviceRadiusKm: 10.0
      }
    ]
  });

  // 4. Chopar
  const chopRaw = JSON.parse(fs.readFileSync('data/menus/chopar-menu.json', 'utf8'));
  const chopOfferings: any[] = [];
  const chopCategories: any[] = [];

  chopRaw.categories.forEach((cat: any, cIdx: number) => {
    const catSlug = cat.slug || `chop-cat-${cIdx + 1}`;
    const catTitle = cat.title?.uz || cat.title?.ru || 'Pitsalar';
    chopCategories.push({
      id: `chop-cat-${cIdx + 1}`,
      slug: catSlug,
      title: catTitle,
      description: cat.title?.ru || null,
      displayOrder: cIdx + 1,
      offeringsCount: cat.items.length
    });

    cat.items.forEach((item: any, iIdx: number) => {
      const title = item.name?.uz || item.name?.ru || 'Pitsa';
      const desc = cleanHtml(item.description?.uz || item.description?.ru || '');
      const img = item.image && isSafePublicHttpsUrl(item.image) ? item.image : null;
      const id = `chop-${item.id || cIdx + '_' + iIdx}`;

      chopOfferings.push({
        id,
        providerId: 'chopar',
        offeringCode: item.code || `CHOP-${(iIdx + 1).toString().padStart(3, '0')}`,
        title,
        description: desc || null,
        categorySlug: catSlug,
        categoryTitle: catTitle,
        imageUrl: img,
        media: img ? [{ url: img, altText: title, order: 0 }] : [],
        basePrice: Number(item.price) || 0,
        currency: 'UZS',
        isAvailable: true,
        variants: [],
        optionGroups: [],
        tags: ['chopar', 'pizza', 'pitsa', catSlug],
        metadata: {
          code: item.code,
          weight: item.weight,
          nameRu: item.name?.ru
        }
      });
    });
  });

  providersData.push({
    slug: 'chopar',
    name: 'Chopar Pizza',
    logoUrl: 'https://cdn.choparpizza.uz/storage/products/2021/10/05/dSNFYddiPY7Hsa5uZqH09JTansLyPdADHXKq7bkz.webp',
    description: 'Chopar Pizza — Sharqona va yevropacha ta’mdagi pitsalar, qarsildoq gazaklar va to‘yimli to‘plamlar.',
    categories: chopCategories,
    offerings: chopOfferings,
    locations: [
      {
        providerLocationId: 'chop-loc-chilonzor',
        name: 'Chopar Pizza — Chilonzor',
        address: 'Toshkent sh., Chilonzor tumani, Bunyodkor shoh ko‘chasi 21',
        latitude: 41.2790,
        longitude: 69.2060,
        operatingHours: { open: '10:00', close: '03:00', days: [1, 2, 3, 4, 5, 6, 7] },
        serviceRadiusKm: 10.0
      },
      {
        providerLocationId: 'chop-loc-oloy',
        name: 'Chopar Pizza — Oloy bozori',
        address: 'Toshkent sh., Mirzo Ulug‘bek tumani, Oloy bozori yonida',
        latitude: 41.3195,
        longitude: 69.2815,
        operatingHours: { open: '10:00', close: '03:00', days: [1, 2, 3, 4, 5, 6, 7] },
        serviceRadiusKm: 10.0
      },
      {
        providerLocationId: 'chop-loc-buyuk-ipak',
        name: 'Chopar Pizza — Maksim Gorkiy',
        address: 'Toshkent sh., Mirzo Ulug‘bek tumani, Buyuk Ipak Yo‘li ko‘chasi 54',
        latitude: 41.3250,
        longitude: 69.3240,
        operatingHours: { open: '10:00', close: '03:00', days: [1, 2, 3, 4, 5, 6, 7] },
        serviceRadiusKm: 10.0
      },
      {
        providerLocationId: 'chop-loc-chorsu',
        name: 'Chopar Pizza — Chorsu',
        address: 'Toshkent sh., Shayxontohur tumani, Zarqaynar ko‘chasi 1',
        latitude: 41.3270,
        longitude: 69.2380,
        operatingHours: { open: '10:00', close: '03:00', days: [1, 2, 3, 4, 5, 6, 7] },
        serviceRadiusKm: 10.0
      }
    ]
  });

  // 5. Yaponamama
  const ymRaw = JSON.parse(fs.readFileSync('data/menus/yaponamama-menu.json', 'utf8'));
  const ymOfferings: any[] = [];
  const ymCategories: any[] = [];

  ymRaw.categories.forEach((cat: any, cIdx: number) => {
    const catSlug = cat.slug || `ym-cat-${cIdx + 1}`;
    const catTitle = cat.title?.uz || cat.title?.ru || 'Sushi';
    ymCategories.push({
      id: `ym-cat-${cIdx + 1}`,
      slug: catSlug,
      title: catTitle,
      description: cat.title?.ru || null,
      displayOrder: cIdx + 1,
      offeringsCount: cat.items.length
    });

    cat.items.forEach((item: any, iIdx: number) => {
      const title = item.name?.uz || item.name?.ru || 'Sushi';
      const desc = cleanHtml(item.description?.uz || item.description?.ru || '');
      const img = item.image && isSafePublicHttpsUrl(item.image) ? item.image : null;
      const id = `ym-${item.id || cIdx + '_' + iIdx}`;

      ymOfferings.push({
        id,
        providerId: 'yaponamama',
        offeringCode: item.code || `YM-${(iIdx + 1).toString().padStart(3, '0')}`,
        title,
        description: desc || null,
        categorySlug: catSlug,
        categoryTitle: catTitle,
        imageUrl: img,
        media: img ? [{ url: img, altText: title, order: 0 }] : [],
        basePrice: Number(item.price) || 0,
        currency: 'UZS',
        isAvailable: true,
        variants: [],
        optionGroups: [],
        tags: ['yaponamama', 'sushi', 'roll', 'pan-asian', catSlug],
        metadata: {
          code: item.code,
          weight: item.weight,
          nameRu: item.name?.ru
        }
      });
    });
  });

  providersData.push({
    slug: 'yaponamama',
    name: 'Yaponamama Pan-Asian & Sushi',
    logoUrl: 'https://cdn.delever.uz/delever/c4b77621-a826-4e4e-a16a-3e64af4a9c12',
    description: 'Yaponamama — Oliy toifadagi yapon va pan-osiyo taomlari, xilma-xil sushi to‘plamlari, rollar va issiq WOK taomlar.',
    categories: ymCategories,
    offerings: ymOfferings,
    locations: [
      {
        providerLocationId: 'ym-loc-rustaveli',
        name: 'Yaponamama — Shota Rustaveli',
        address: 'Toshkent sh., Yakkasaroy tumani, Shota Rustaveli ko‘chasi 69',
        latitude: 41.2880,
        longitude: 69.2550,
        operatingHours: { open: '11:00', close: '23:00', days: [1, 2, 3, 4, 5, 6, 7] },
        serviceRadiusKm: 10.0
      },
      {
        providerLocationId: 'ym-loc-amirtemur',
        name: 'Yaponamama — Amir Temur',
        address: 'Toshkent sh., Yunusobod tumani, Amir Temur ko‘chasi 60',
        latitude: 41.3320,
        longitude: 69.2830,
        operatingHours: { open: '11:00', close: '23:00', days: [1, 2, 3, 4, 5, 6, 7] },
        serviceRadiusKm: 10.0
      },
      {
        providerLocationId: 'ym-loc-shevchenko',
        name: 'Yaponamama — Taras Shevchenko',
        address: 'Toshkent sh., Mirobod tumani, Taras Shevchenko ko‘chasi 34',
        latitude: 41.3020,
        longitude: 69.2740,
        operatingHours: { open: '11:00', close: '23:00', days: [1, 2, 3, 4, 5, 6, 7] },
        serviceRadiusKm: 10.0
      },
      {
        providerLocationId: 'ym-loc-chilonzor',
        name: 'Yaponamama — Chilonzor',
        address: 'Toshkent sh., Chilonzor tumani, Qatortol ko‘chasi 37',
        latitude: 41.2835,
        longitude: 69.2105,
        operatingHours: { open: '11:00', close: '23:00', days: [1, 2, 3, 4, 5, 6, 7] },
        serviceRadiusKm: 10.0
      }
    ]
  });

  return providersData;
}

// Test validation
if (require.main === module) {
  const data = loadAndFormatAllMenus();
  let totalOfferings = 0;
  let validOfferings = 0;

  for (const p of data) {
    console.log(`\nValidating provider "${p.slug}" (${p.name}):`);
    console.log(` - Categories: ${p.categories.length}`);
    console.log(` - Offerings: ${p.offerings.length}`);
    console.log(` - Locations: ${p.locations.length}`);

    p.categories.forEach((cat: any) => {
      const res = CatalogCategorySchema.safeParse(cat);
      if (!res.success) {
        console.error(` Category validation failed for ${cat.slug}:`, res.error.issues);
      }
    });

    p.offerings.forEach((off: any) => {
      totalOfferings++;
      const res = OfferingSchema.safeParse(off);
      if (!res.success) {
        console.error(` Offering validation failed for ${off.id}:`, res.error.issues);
      } else {
        validOfferings++;
      }
    });
  }

  console.log(`\n=============================`);
  console.log(`Total Offerings Checked: ${totalOfferings}`);
  console.log(`Valid Offerings: ${validOfferings}`);
  console.log(`Validation Success Rate: ${((validOfferings / totalOfferings) * 100).toFixed(2)}%`);
}
