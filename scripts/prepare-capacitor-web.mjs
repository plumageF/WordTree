import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webDir = path.join(rootDir, "www");

const files = [
  "index.html",
  "styles.css",
  "app.js"
];

const directories = [
  "assets",
  "data"
];

rmSync(webDir, { recursive: true, force: true });
mkdirSync(webDir, { recursive: true });

for (const file of files) {
  cpSync(path.join(rootDir, file), path.join(webDir, file));
}

for (const directory of directories) {
  const source = path.join(rootDir, directory);
  if (existsSync(source)) {
    cpSync(source, path.join(webDir, directory), { recursive: true });
  }
}

console.log(`Prepared Capacitor web assets in ${webDir}`);
