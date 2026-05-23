import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceIcon = path.join(rootDir, "assets", "wordtree-logo.png");
const resDir = path.join(rootDir, "android", "app", "src", "main", "res");

const launcherSizes = [
  ["mipmap-mdpi", 48],
  ["mipmap-hdpi", 72],
  ["mipmap-xhdpi", 96],
  ["mipmap-xxhdpi", 144],
  ["mipmap-xxxhdpi", 192]
];

const foregroundSizes = [
  ["mipmap-mdpi", 108],
  ["mipmap-hdpi", 162],
  ["mipmap-xhdpi", 216],
  ["mipmap-xxhdpi", 324],
  ["mipmap-xxxhdpi", 432]
];

if (!existsSync(sourceIcon)) {
  throw new Error(`Missing source icon: ${sourceIcon}`);
}

if (!existsSync(resDir)) {
  throw new Error("Android project not found. Run npx cap add android first.");
}

function resize(size, target) {
  mkdirSync(path.dirname(target), { recursive: true });
  execFileSync("sips", ["-z", String(size), String(size), sourceIcon, "--out", target], {
    stdio: "ignore"
  });
}

for (const [bucket, size] of launcherSizes) {
  const launcher = path.join(resDir, bucket, "ic_launcher.png");
  resize(size, launcher);
  copyFileSync(launcher, path.join(resDir, bucket, "ic_launcher_round.png"));
}

for (const [bucket, size] of foregroundSizes) {
  resize(size, path.join(resDir, bucket, "ic_launcher_foreground.png"));
}

console.log("Updated Android launcher icons from assets/wordtree-logo.png");
