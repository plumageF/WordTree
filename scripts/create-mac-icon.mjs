import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceIcon = path.join(rootDir, "assets", "wordtree-logo.png");
const iconsetDir = path.join(rootDir, "build", "icon.iconset");
const outputIcon = path.join(rootDir, "build", "icon.icns");

const sizes = [
  ["icon_16x16.png", 16, "icp4"],
  ["icon_16x16@2x.png", 32, "icp5"],
  ["icon_32x32.png", 32, "icp5"],
  ["icon_32x32@2x.png", 64, "icp6"],
  ["icon_128x128.png", 128, "ic07"],
  ["icon_128x128@2x.png", 256, "ic08"],
  ["icon_256x256.png", 256, "ic08"],
  ["icon_256x256@2x.png", 512, "ic09"],
  ["icon_512x512.png", 512, "ic09"],
  ["icon_512x512@2x.png", 1024, "ic10"]
];

if (!existsSync(sourceIcon)) {
  throw new Error(`Missing source icon: ${sourceIcon}`);
}

rmSync(iconsetDir, { recursive: true, force: true });
mkdirSync(iconsetDir, { recursive: true });

const chunks = [];
const chunkKeys = new Set();

for (const [fileName, size, chunkType] of sizes) {
  const target = path.join(iconsetDir, fileName);
  execFileSync("sips", ["-z", String(size), String(size), sourceIcon, "--out", target], {
    stdio: "ignore"
  });

  if (chunkKeys.has(chunkType)) {
    continue;
  }

  chunkKeys.add(chunkType);
  const data = readFileSync(target);
  const header = Buffer.alloc(8);
  header.write(chunkType, 0, 4, "ascii");
  header.writeUInt32BE(data.length + 8, 4);
  chunks.push(header, data);
}

const totalLength = 8 + chunks.reduce((sum, chunk) => sum + chunk.length, 0);
const fileHeader = Buffer.alloc(8);
fileHeader.write("icns", 0, 4, "ascii");
fileHeader.writeUInt32BE(totalLength, 4);

writeFileSync(outputIcon, Buffer.concat([fileHeader, ...chunks], totalLength));
console.log(`Created ${outputIcon}`);
