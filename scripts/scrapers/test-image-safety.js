const { isSafePublicHttpsUrl } = require('@zayuno/contracts');

const testUrls = [
  'https://io.bellissimo.uz/images/03650000-6bec-ac1f-05ef-08db9f189c3d.jpg',
  'https://16a9564f-f8ec-42ba-a998-3027aa809e50.selstorage.ru/evos/72611/30864/images/items/5a32a682e6503452c9fa57317ae0666e.PNG',
  'https://cdn.delever.uz/delever/c3684082-16ac-46b1-bbac-29549bcd29e7',
  'https://cdn.choparpizza.uz/storage/products/2021/10/05/dSNFYddiPY7Hsa5uZqH09JTansLyPdADHXKq7bkz.webp',
  'https://cdn.delever.uz/delever/c4b77621-a826-4e4e-a16a-3e64af4a9c12'
];

for (const u of testUrls) {
  console.log(u, '=> safe?', isSafePublicHttpsUrl(u));
}
