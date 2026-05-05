#!/usr/bin/env node
// Resizes + compresses tower-icon PNGs from src/image/ (masters, lossless)
// into public/assets/icons/ (256x256 palette PNGs, ~100-200 KB each) where
// Phaser's preload reads them with the game's tower keys.
//
// Run with: npm run sync-icons

import { existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SRC_DIR = join(ROOT, "src", "image");
const DEST_DIR = join(ROOT, "public", "assets", "icons");

// Source filename in src/image/ -> destination filename in public/assets/icons/
const MAPPING = {
  "sniper.png":    "sniper.png",
  "cannon.png":    "cannon.png",
  "frost.png":     "frost.png",
  "mechanest.png": "mechanest.png",
  "laser.png":     "laser.png",
  "inferno.png":   "inferno.png",
  "tesla.png":     "tesla.png",
  "frostgun.png":  "frostgun.png",
  "fireworks.png": "fireworks.png",
  "tornado.png":   "tornado.png",
};

const TARGET_SIZE = 256;

function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

let processed = 0;
let missing = 0;
let totalIn = 0;
let totalOut = 0;
const PAD = 18;

for (const [srcName, destName] of Object.entries(MAPPING)) {
  const srcPath = join(SRC_DIR, srcName);
  const destPath = join(DEST_DIR, destName);

  if (!existsSync(srcPath)) {
    console.log(`-  ${srcName.padEnd(PAD)}  (not in src/image/, skipping)`);
    missing++;
    continue;
  }

  const inBytes = statSync(srcPath).size;
  await sharp(srcPath)
    .resize(TARGET_SIZE, TARGET_SIZE, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({
      compressionLevel: 9,
      palette: true,
      quality: 90,
      effort: 10,
    })
    .toFile(destPath);
  const outBytes = statSync(destPath).size;

  totalIn += inBytes;
  totalOut += outBytes;
  processed++;

  const pct = ((1 - outBytes / inBytes) * 100).toFixed(0);
  console.log(
    `+  ${srcName.padEnd(PAD)} -> ${destName.padEnd(16)}  ${fmtSize(inBytes).padStart(9)} -> ${fmtSize(outBytes).padStart(9)}  (-${pct}%)`,
  );
}

console.log("");
console.log(
  `Done: ${processed} processed, ${missing} missing.  ` +
    `Total ${fmtSize(totalIn)} -> ${fmtSize(totalOut)}` +
    (totalIn > 0 ? `  (-${((1 - totalOut / totalIn) * 100).toFixed(0)}%)` : ""),
);
