import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const mobileDir = path.resolve(scriptDir, "..");
const repoDir = path.resolve(mobileDir, "../..");
const sourcePath = path.join(repoDir, "apps/provider-portal/public/logo2.webp");
const assetsDir = path.join(mobileDir, "assets");
const storeDir = path.join(mobileDir, "play-store");

await fs.mkdir(storeDir, { recursive: true });

const source = sharp(sourcePath).rotate();
const sourceMetadata = await source.metadata();
if (sourceMetadata.width !== 512 || sourceMetadata.height !== 512) {
  throw new Error("Canonical Zayuno logo must be 512x512.");
}

// Preserve the approved Zayuno artwork exactly for the legacy launcher and store icon.
await sharp(sourcePath)
  .resize(1024, 1024, { fit: "fill", kernel: sharp.kernel.lanczos3 })
  .png({ compressionLevel: 9 })
  .toFile(path.join(assetsDir, "icon.png"));

await sharp(sourcePath)
  .resize(512, 512, { fit: "fill", kernel: sharp.kernel.lanczos3 })
  .ensureAlpha(1)
  .png({ compressionLevel: 9 })
  .toFile(path.join(storeDir, "icon-512.png"));

await sharp({
  create: { width: 1024, height: 1024, channels: 3, background: "#050816" },
})
  .png({ compressionLevel: 9 })
  .toFile(path.join(assetsDir, "android-icon-background.png"));

// Android uses the alpha channel of this asset for themed icons.
const { data, info } = await sharp(sourcePath)
  .resize(680, 680, { fit: "contain" })
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const monochrome = Buffer.alloc(info.width * info.height * 4);
const colorForeground = Buffer.alloc(info.width * info.height * 4);
for (let i = 0; i < info.width * info.height; i += 1) {
  const r = data[i * 3];
  const g = data[i * 3 + 1];
  const b = data[i * 3 + 2];
  // The approved mark is vivid blue/cyan while its tile is near-black navy.
  // A blue-channel luminance mask keeps the mark and glow without the baked tile.
  const alpha = Math.min(255, Math.max(0, (b - 145) * 5));
  colorForeground[i * 4] = r;
  colorForeground[i * 4 + 1] = g;
  colorForeground[i * 4 + 2] = b;
  colorForeground[i * 4 + 3] = Math.round(alpha);
  monochrome[i * 4] = 255;
  monochrome[i * 4 + 1] = 255;
  monochrome[i * 4 + 2] = 255;
  monochrome[i * 4 + 3] = Math.round(alpha);
}
await sharp({
  create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite([
    {
      input: await sharp(colorForeground, { raw: { width: info.width, height: info.height, channels: 4 } })
        .png()
        .toBuffer(),
      gravity: "center",
    },
  ])
  .png({ compressionLevel: 9 })
  .toFile(path.join(assetsDir, "android-icon-foreground.png"));

await sharp({
  create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite([
    {
      input: await sharp(monochrome, { raw: { width: info.width, height: info.height, channels: 4 } })
        .png()
        .toBuffer(),
      gravity: "center",
    },
  ])
  .png({ compressionLevel: 9 })
  .toFile(path.join(assetsDir, "android-icon-monochrome.png"));

await sharp({
  create: { width: 1024, height: 1024, channels: 3, background: "#050816" },
})
  .composite([
    {
      input: await sharp(sourcePath).resize(400, 400, { fit: "contain" }).png().toBuffer(),
      gravity: "center",
    },
  ])
  .png({ compressionLevel: 9 })
  .toFile(path.join(assetsDir, "splash-icon.png"));

const featureSvg = Buffer.from(`
<svg width="1024" height="500" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#050816"/>
      <stop offset="1" stop-color="#101A37"/>
    </linearGradient>
    <radialGradient id="glow">
      <stop offset="0" stop-color="#087DFF" stop-opacity=".34"/>
      <stop offset="1" stop-color="#087DFF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="500" fill="url(#bg)"/>
  <circle cx="250" cy="250" r="245" fill="url(#glow)"/>
  <text x="475" y="205" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="72" font-weight="700" letter-spacing="14">ZAYUNO</text>
  <text x="479" y="265" fill="#B8C5E3" font-family="Arial, sans-serif" font-size="28">AI yordamida toping va buyurtma qiling</text>
</svg>`);
await sharp(featureSvg)
  .composite([
    {
      input: await sharp(sourcePath).resize(330, 330, { fit: "contain" }).png().toBuffer(),
      left: 80,
      top: 85,
    },
  ])
  .removeAlpha()
  .png({ compressionLevel: 9 })
  .toFile(path.join(storeDir, "feature-graphic-1024x500.png"));

console.log(`Play assets generated from ${path.relative(repoDir, sourcePath)}`);
