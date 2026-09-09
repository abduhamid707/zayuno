import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const mobileDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = async (name) => JSON.parse(await fs.readFile(path.join(mobileDir, name), "utf8"));
const app = (await readJson("app.json")).expo;
const eas = await readJson("eas.json");
const errors = [];

if (!app.android?.package) errors.push("android.package is missing");
if (!Number.isInteger(app.android?.versionCode) || app.android.versionCode < 1) errors.push("android.versionCode must be positive");
if (!app.android?.adaptiveIcon?.foregroundImage) errors.push("adaptive foreground icon is missing");
if (!app.android?.adaptiveIcon?.monochromeImage) errors.push("themed monochrome icon is missing");
if (eas.build?.production?.android?.buildType !== "app-bundle") errors.push("production must create an AAB");

const buildProperties = app.plugins.find((plugin) => Array.isArray(plugin) && plugin[0] === "expo-build-properties");
if (buildProperties?.[1]?.android?.targetSdkVersion !== 36) errors.push("targetSdkVersion must be 36");
if (buildProperties?.[1]?.android?.usesCleartextTraffic !== false) errors.push("cleartext traffic must be disabled");

for (const [relativePath, width, height] of [
  ["assets/icon.png", 1024, 1024],
  ["play-store/icon-512.png", 512, 512],
  ["play-store/feature-graphic-1024x500.png", 1024, 500],
]) {
  const metadata = await sharp(path.join(mobileDir, relativePath)).metadata();
  if (metadata.width !== width || metadata.height !== height) {
    errors.push(`${relativePath} must be ${width}x${height}`);
  }
  if (relativePath === "play-store/icon-512.png" && !metadata.hasAlpha) {
    errors.push("Play Store icon must be a 32-bit PNG with alpha");
  }
  if (relativePath === "play-store/feature-graphic-1024x500.png" && metadata.hasAlpha) {
    errors.push("Feature graphic must not have an alpha channel");
  }
}

const storeIconSize = (await fs.stat(path.join(mobileDir, "play-store/icon-512.png"))).size;
if (storeIconSize > 1024 * 1024) errors.push("Play Store icon must be 1 MB or smaller");

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}
console.log("Android Play readiness checks passed.");
