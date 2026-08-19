import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';

// Helper to create a valid uncompressed/deflated RGBA PNG file
function createPng(width: number, height: number, renderPixel: (x: number, y: number) => [number, number, number, number]): Buffer {
  const rowSize = width * 4 + 1; // 1 filter byte per scanline
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = renderPixel(x, y);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // PNG Signature
  const pngSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR Chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth: 8
  ihdrData[9] = 6; // Color type: 6 (RGBA)
  ihdrData[10] = 0; // Compression: Deflate
  ihdrData[11] = 0; // Filter: Adaptive
  ihdrData[12] = 0; // Interlace: None
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT Chunk
  const idatChunk = makeChunk('IDAT', deflated);

  // IEND Chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([pngSig, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type: string, data: Buffer): Buffer {
  const len = data.length;
  const chunk = Buffer.alloc(4 + 4 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const crc = crc32(chunk.subarray(4, 8 + len));
  chunk.writeInt32BE(crc, 8 + len);
  return chunk;
}

// CRC32 implementation for PNG
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = (c >>> 8) ^ crcTable[(c ^ buf[i]) & 0xff];
  }
  return (c ^ 0xffffffff) | 0;
}

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

// Rendering function for Zayuno Logo (Geometric Z on sleek gradient background)
function renderZayunoIcon(size: number): Buffer {
  return createPng(size, size, (x, y) => {
    const nx = x / (size - 1);
    const ny = y / (size - 1);

    // Rounded card background
    const cornerRadius = 0.22;
    const dx = Math.max(0, Math.abs(nx - 0.5) - (0.5 - cornerRadius));
    const dy = Math.max(0, Math.abs(ny - 0.5) - (0.5 - cornerRadius));
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > cornerRadius) {
      return [0, 0, 0, 0]; // Transparent outside rounded corner
    }

    // Gradient background: Dark Slate/Navy #0f172a to #0284c7 (Ocean/Cyan)
    const bgR = Math.round(15 + nx * 5 + ny * 15);
    const bgG = Math.round(23 + nx * 40 + ny * 60);
    const bgB = Math.round(42 + nx * 120 + ny * 140);

    // Draw stylized 'Z' Action Glyphs
    // Top horizontal bar: y in [0.26, 0.36], x in [0.24, 0.76]
    // Bottom horizontal bar: y in [0.64, 0.74], x in [0.24, 0.76]
    // Diagonal stroke: connecting (0.76, 0.32) to (0.24, 0.68) with thickness ~0.10
    const inTopBar = ny >= 0.26 && ny <= 0.36 && nx >= 0.24 && nx <= 0.76;
    const inBottomBar = ny >= 0.64 && ny <= 0.74 && nx >= 0.24 && nx <= 0.76;

    // Diagonal line distance: line from (0.74, 0.30) to (0.26, 0.70)
    // equation: (x - x1)*(y2 - y1) - (y - y1)*(x2 - x1)
    const x1 = 0.72, y1 = 0.30, x2 = 0.28, y2 = 0.70;
    const lenSq = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    const t = Math.max(0, Math.min(1, ((nx - x1) * (x2 - x1) + (ny - y1) * (y2 - y1)) / lenSq));
    const projX = x1 + t * (x2 - x1);
    const projY = y1 + t * (y2 - y1);
    const diagDist = Math.sqrt((nx - projX) ** 2 + (ny - projY) ** 2);
    const inDiagonal = diagDist <= 0.055 && ny >= 0.30 && ny <= 0.70;

    // Action lightning dot (upper right accent): centered at (0.78, 0.24)
    const dotDist = Math.sqrt((nx - 0.76) ** 2 + (ny - 0.24) ** 2);
    const inAccentDot = dotDist <= 0.045;

    if (inTopBar || inBottomBar || inDiagonal) {
      // Emerald / Cyan radiant gradient for the Z mark (#10b981 to #38bdf8)
      const gradT = (nx + ny) / 2;
      const zR = Math.round(16 + gradT * 40);
      const zG = Math.round(185 + gradT * 40);
      const zB = Math.round(129 + gradT * 115);
      return [zR, zG, zB, 255];
    }

    if (inAccentDot) {
      // Amber energy dot (#f59e0b)
      return [245, 158, 11, 255];
    }

    return [bgR, bgG, bgB, 255];
  });
}

function renderZayunoOgImage(): Buffer {
  const width = 1200;
  const height = 630;

  return createPng(width, height, (x, y) => {
    const nx = x / (width - 1);
    const ny = y / (height - 1);

    // Deep dark background with ambient emerald & cyan gradient glows
    const distCenter = Math.sqrt((nx - 0.5) ** 2 + (ny - 0.5) ** 2);
    const distGlowLeft = Math.sqrt((nx - 0.3) ** 2 + (ny - 0.4) ** 2);
    const distGlowRight = Math.sqrt((nx - 0.7) ** 2 + (ny - 0.6) ** 2);

    let bgR = Math.round(2 + Math.max(0, 1 - distGlowLeft * 1.8) * 15);
    let bgG = Math.round(6 + Math.max(0, 1 - distGlowLeft * 1.8) * 45 + Math.max(0, 1 - distGlowRight * 2) * 20);
    let bgB = Math.round(23 + Math.max(0, 1 - distGlowRight * 1.8) * 60 + Math.max(0, 1 - distCenter * 1.5) * 20);

    // Subtle grid pattern
    if (x % 40 === 0 || y % 40 === 0) {
      bgR = Math.min(255, bgR + 6);
      bgG = Math.min(255, bgG + 8);
      bgB = Math.min(255, bgB + 14);
    }

    // Outer card badge for Zayuno Logo mark on left side: center (0.24, 0.50), size 260px
    const logoCenterX = 0.24;
    const logoCenterY = 0.50;
    const logoSizeNormX = 220 / width;
    const logoSizeNormY = 220 / height;

    const lx = (nx - (logoCenterX - logoSizeNormX / 2)) / logoSizeNormX;
    const ly = (ny - (logoCenterY - logoSizeNormY / 2)) / logoSizeNormY;

    if (lx >= 0 && lx <= 1 && ly >= 0 && ly <= 1) {
      const cornerRadius = 0.24;
      const dx = Math.max(0, Math.abs(lx - 0.5) - (0.5 - cornerRadius));
      const dy = Math.max(0, Math.abs(ly - 0.5) - (0.5 - cornerRadius));
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= cornerRadius) {
        // Z emblem card background
        const inTopBar = ly >= 0.26 && ly <= 0.36 && lx >= 0.24 && lx <= 0.76;
        const inBottomBar = ly >= 0.64 && ly <= 0.74 && lx >= 0.24 && lx <= 0.76;
        const x1 = 0.72, y1 = 0.30, x2 = 0.28, y2 = 0.70;
        const lenSq = (x2 - x1) ** 2 + (y2 - y1) ** 2;
        const t = Math.max(0, Math.min(1, ((lx - x1) * (x2 - x1) + (ly - y1) * (y2 - y1)) / lenSq));
        const projX = x1 + t * (x2 - x1);
        const projY = y1 + t * (y2 - y1);
        const diagDist = Math.sqrt((lx - projX) ** 2 + (ly - projY) ** 2);
        const inDiagonal = diagDist <= 0.055 && ly >= 0.30 && ly <= 0.70;
        const dotDist = Math.sqrt((lx - 0.76) ** 2 + (ly - 0.24) ** 2);
        const inAccentDot = dotDist <= 0.045;

        if (inTopBar || inBottomBar || inDiagonal) {
          const gradT = (lx + ly) / 2;
          return [Math.round(16 + gradT * 40), Math.round(185 + gradT * 40), Math.round(129 + gradT * 115), 255];
        }
        if (inAccentDot) {
          return [245, 158, 11, 255];
        }
        return [15, 23, 42, 255];
      }
    }

    // Top and bottom border accent line
    if (y < 4 || y > height - 5) {
      return [16, 185, 129, 200];
    }

    return [bgR, bgG, bgB, 255];
  });
}

function main() {
  const assetsDir = path.join(process.cwd(), 'apps/api/public/assets');
  fs.mkdirSync(assetsDir, { recursive: true });

  console.log('🎨 Generating High-Resolution Zayuno Brand Assets...');

  // 1. Directory Icon (512x512)
  const icon512 = renderZayunoIcon(512);
  const icon512Path = path.join(assetsDir, 'icon-512.png');
  fs.writeFileSync(icon512Path, icon512);
  console.log(`✅ Generated 512×512 Directory Icon: ${icon512Path} (${icon512.length} bytes)`);

  // 2. Composer Icon (128x128)
  const icon128 = renderZayunoIcon(128);
  const icon128Path = path.join(assetsDir, 'icon-128.png');
  fs.writeFileSync(icon128Path, icon128);
  console.log(`✅ Generated 128×128 Composer Icon: ${icon128Path} (${icon128.length} bytes)`);

  // 3. SVG Vector Logo
  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg-grad" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="50%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0369a1"/>
    </linearGradient>
    <linearGradient id="z-grad" x1="120" y1="120" x2="392" y2="392" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="50%" stop-color="#06b6d4"/>
      <stop offset="100%" stop-color="#38bdf8"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg-grad)"/>
  <rect x="2" y="2" width="508" height="508" rx="110" stroke="rgba(255,255,255,0.12)" stroke-width="3"/>
  <g filter="url(#glow)">
    <path d="M130 145 H382 V195 L220 325 H382 V375 H130 V325 L292 195 H130 V145 Z" fill="url(#z-grad)"/>
    <circle cx="395" cy="130" r="22" fill="#f59e0b"/>
  </g>
</svg>`;
  const svgPath = path.join(assetsDir, 'logo.svg');
  fs.writeFileSync(svgPath, svgContent, 'utf8');
  console.log(`✅ Generated SVG Vector Logo: ${svgPath}`);

  // 4. Favicon ICO
  const faviconPath = path.join(assetsDir, 'favicon.ico');
  fs.writeFileSync(faviconPath, icon128); // Standard ICO fallback
  console.log(`✅ Generated Favicon: ${faviconPath}`);

  // 5. Open Graph Image (1200x630)
  const ogImage = renderZayunoOgImage();
  const ogImagePath = path.join(assetsDir, 'og-image.png');
  fs.writeFileSync(ogImagePath, ogImage);
  console.log(`✅ Generated 1200×630 Open Graph Image: ${ogImagePath} (${ogImage.length} bytes)`);
}

main();

