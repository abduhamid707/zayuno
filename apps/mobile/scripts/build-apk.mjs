import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const mobileDir = path.resolve(scriptDir, "..");
const rootDir = path.resolve(mobileDir, "..", "..");
const androidDir = path.join(mobileDir, "android");

console.log("🚀 Starting Universal Release APK build for Zayuno...");

// 1. Check if android folder exists
if (!fs.existsSync(androidDir)) {
  console.error("❌ Android folder not found in apps/mobile/android");
  process.exit(1);
}

// 2. Run gradlew assembleRelease
const isWindows = process.platform === "win32";
const gradlewCmd = isWindows ? ".\\gradlew.bat" : "./gradlew";

console.log("📦 Running Gradle assembleRelease...");
try {
  execSync(`${gradlewCmd} assembleRelease`, {
    cwd: androidDir,
    stdio: "inherit",
    env: { ...process.env },
  });
} catch (err) {
  console.error("❌ Gradle build failed:", err.message);
  process.exit(1);
}

// 3. Locate generated APK
const releaseApkPath = path.join(
  androidDir,
  "app",
  "build",
  "outputs",
  "apk",
  "release",
  "app-release.apk"
);

if (!fs.existsSync(releaseApkPath)) {
  console.error("❌ Built APK not found at:", releaseApkPath);
  process.exit(1);
}

// 4. Copy to friendly paths
const rootApkPath = path.join(rootDir, "zayuno.apk");
const mobileApkPath = path.join(mobileDir, "zayuno.apk");

fs.copyFileSync(releaseApkPath, rootApkPath);
fs.copyFileSync(releaseApkPath, mobileApkPath);

const stat = fs.statSync(rootApkPath);
const sizeMb = (stat.size / (1024 * 1024)).toFixed(1);

console.log("\n=======================================================");
console.log(`✅ Universal APK build successful!`);
console.log(`📁 File: ${rootApkPath}`);
console.log(`📊 Size: ${sizeMb} MB (${stat.size.toLocaleString()} bytes)`);
console.log("=======================================================\n");
