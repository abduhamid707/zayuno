import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

async function main() {
  const rootDir = path.resolve(__dirname, '..');
  const rawDir = path.join(rootDir, 'logo_and_favicons');
  const brandAssetsDir = path.join(rootDir, 'packages', 'brand-assets');
  const brandRawDir = path.join(brandAssetsDir, 'raw');
  const brandDistDir = path.join(brandAssetsDir, 'dist');

  console.log('🎨 Starting Zayuno Brand Assets & Favicons Optimization Pipeline...');

  // Ensure directories exist
  [brandAssetsDir, brandRawDir, brandDistDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  const sourceLogo = path.join(rawDir, 'logo.png');
  const sourceFaviconIo = path.join(rawDir, 'favicon_io');

  if (!fs.existsSync(sourceLogo)) {
    throw new Error(`Source logo not found at: ${sourceLogo}`);
  }

  // 1. Copy raw files into packages/brand-assets/raw/
  console.log('  [1/5] Backing up raw source assets to packages/brand-assets/raw/...');
  fs.copyFileSync(sourceLogo, path.join(brandRawDir, 'logo.png'));
  if (fs.existsSync(sourceFaviconIo)) {
    const rawFaviconIoDest = path.join(brandRawDir, 'favicon_io');
    if (!fs.existsSync(rawFaviconIoDest)) fs.mkdirSync(rawFaviconIoDest, { recursive: true });
    fs.readdirSync(sourceFaviconIo).forEach(file => {
      fs.copyFileSync(path.join(sourceFaviconIo, file), path.join(rawFaviconIoDest, file));
    });
  }

  // 2. Generate Optimized Images
  console.log('  [2/5] Compressing and generating multi-resolution assets...');
  
  // 512x512 Logo PNG
  const logo512Buffer = await sharp(sourceLogo)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, quality: 90 })
    .toBuffer();
  fs.writeFileSync(path.join(brandDistDir, 'icon-512.png'), logo512Buffer);
  fs.writeFileSync(path.join(brandDistDir, 'logo.png'), logo512Buffer);

  // 512x512 WebP
  const logoWebpBuffer = await sharp(sourceLogo)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 90 })
    .toBuffer();
  fs.writeFileSync(path.join(brandDistDir, 'logo.webp'), logoWebpBuffer);

  // 192x192 Android / PWA Icon
  const icon192Buffer = await sharp(sourceLogo)
    .resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, quality: 90 })
    .toBuffer();
  fs.writeFileSync(path.join(brandDistDir, 'icon-192.png'), icon192Buffer);
  fs.writeFileSync(path.join(brandDistDir, 'android-chrome-192x192.png'), icon192Buffer);

  // 128x128 Composer Icon
  const icon128Buffer = await sharp(sourceLogo)
    .resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, quality: 90 })
    .toBuffer();
  fs.writeFileSync(path.join(brandDistDir, 'icon-128.png'), icon128Buffer);

  // 180x180 Apple Touch Icon
  const appleTouchBuffer = await sharp(sourceLogo)
    .resize(180, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, quality: 90 })
    .toBuffer();
  fs.writeFileSync(path.join(brandDistDir, 'apple-touch-icon.png'), appleTouchBuffer);

  // 32x32 Favicon PNG
  const favicon32Buffer = await sharp(sourceLogo)
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
  fs.writeFileSync(path.join(brandDistDir, 'favicon-32x32.png'), favicon32Buffer);

  // 16x16 Favicon PNG
  const favicon16Buffer = await sharp(sourceLogo)
    .resize(16, 16, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
  fs.writeFileSync(path.join(brandDistDir, 'favicon-16x16.png'), favicon16Buffer);

  // Favicon ICO (use source favicon.ico from favicon_io if present, or write 32px png as fallback)
  const sourceIco = path.join(sourceFaviconIo, 'favicon.ico');
  if (fs.existsSync(sourceIco)) {
    fs.copyFileSync(sourceIco, path.join(brandDistDir, 'favicon.ico'));
  } else {
    fs.writeFileSync(path.join(brandDistDir, 'favicon.ico'), favicon32Buffer);
  }

  // 3. Generate 1200x630 OpenGraph Image (og-image.png)
  console.log('  [3/5] Generating branded 1200x630 OpenGraph social preview card...');
  const ogBackgroundSvg = `
  <svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="1200" height="630" fill="#020617"/>
    <circle cx="1100" cy="100" r="350" fill="#0369a1" opacity="0.2" filter="blur(80px)"/>
    <circle cx="100" cy="550" r="300" fill="#059669" opacity="0.2" filter="blur(80px)"/>
    <circle cx="600" cy="315" r="200" fill="#0284c7" opacity="0.1" filter="blur(60px)"/>
    <rect x="60" y="60" width="1080" height="510" rx="24" stroke="rgba(255,255,255,0.08)" stroke-width="2"/>
    <text x="560" y="270" font-family="Plus Jakarta Sans, sans-serif" font-size="56" font-weight="800" fill="#ffffff">Zayuno</text>
    <text x="560" y="325" font-family="Plus Jakarta Sans, sans-serif" font-size="24" font-weight="700" fill="#10b981" letter-spacing="1">ACTION INFRASTRUCTURE FOR AI</text>
    <text x="560" y="380" font-family="Plus Jakarta Sans, sans-serif" font-size="20" font-weight="400" fill="#94a3b8">Model Context Protocol • Discovery • Verified Quotes • Actions</text>
    <rect x="560" y="420" width="160" height="36" rx="18" fill="#10b981" opacity="0.15"/>
    <text x="580" y="444" font-family="Plus Jakarta Sans, sans-serif" font-size="14" font-weight="700" fill="#34d399">mcp.zayuno.uz</text>
  </svg>`;

  const bgBuffer = Buffer.from(ogBackgroundSvg);
  const logo320Buffer = await sharp(sourceLogo)
    .resize(320, 320, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const ogCardBuffer = await sharp(bgBuffer)
    .composite([
      { input: logo320Buffer, top: 155, left: 160 }
    ])
    .png({ compressionLevel: 8 })
    .toBuffer();

  fs.writeFileSync(path.join(brandDistDir, 'og-image.png'), ogCardBuffer);

  // 4. Generate Web Manifest (site.webmanifest)
  console.log('  [4/5] Generating PWA site.webmanifest...');
  const manifestJson = {
    name: 'Zayuno — Action Infrastructure for AI Agents',
    short_name: 'Zayuno',
    description: 'Natural marketplace assistant enabling customers to discover services, calculate verified quotes, and execute actions.',
    start_url: '/',
    display: 'standalone',
    background_color: '#020617',
    theme_color: '#020617',
    icons: [
      {
        src: '/assets/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable'
      },
      {
        src: '/assets/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable'
      }
    ]
  };
  fs.writeFileSync(path.join(brandDistDir, 'site.webmanifest'), JSON.stringify(manifestJson, null, 2));

  // Copy SVG Logo if present
  const existingSvg = path.join(rootDir, 'apps', 'api', 'public', 'assets', 'logo.svg');
  if (fs.existsSync(existingSvg)) {
    fs.copyFileSync(existingSvg, path.join(brandDistDir, 'logo.svg'));
  }

  // 5. Synchronize all generated assets to target app folders
  console.log('  [5/5] Synchronizing assets to apps/api, apps/admin, and apps/provider-portal...');
  const targetDirs = [
    path.join(rootDir, 'apps', 'api', 'public', 'assets'),
    path.join(rootDir, 'apps', 'admin', 'public'),
    path.join(rootDir, 'apps', 'provider-portal', 'public')
  ];

  targetDirs.forEach(targetDir => {
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    fs.readdirSync(brandDistDir).forEach(file => {
      fs.copyFileSync(path.join(brandDistDir, file), path.join(targetDir, file));
    });
  });

  console.log('✨ All Brand Assets, Logos, Favicons, Manifests, and OG Cards successfully built & synchronized!');
}

main().catch(err => {
  console.error('❌ Failed to optimize brand assets:', err);
  process.exit(1);
});
