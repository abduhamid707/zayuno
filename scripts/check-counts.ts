import { PROVIDERS_25 } from './build-ecosystem-25';

console.log('Total Providers:', PROVIDERS_25.length);
let all20Plus = true;
for (const p of PROVIDERS_25) {
  console.log(`${p.slug.padEnd(25)} : ${p.offerings.length} offerings`);
  if (p.offerings.length < 20) {
    all20Plus = false;
  }
}
console.log('All have 20+ offerings?', all20Plus);
