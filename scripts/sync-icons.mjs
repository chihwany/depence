#!/usr/bin/env node
// Copies tower-icon PNGs from src/image/ (where the user drops new
// AI-generated art with their own filenames) to public/assets/icons/
// (where Phaser's preload reads them from with the game's tower keys).
//
// Run with: npm run sync-icons

import { readFileSync, copyFileSync, existsSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SRC_DIR = join(ROOT, "src", "image");
const DEST_DIR = join(ROOT, "public", "assets", "icons");

// Source filename in src/image/ -> destination filename in public/assets/icons/
const MAPPING = {
  "sniper.png":   "sniper.png",
  "cannon.png":   "cannon.png",
  "frost.png":       "frost.png",
  "mechanest.png":     "mechanest.png",
  "laser.png":  "laser.png",
  "inferno.png": "inferno.png",
  "tesla.png":          "tesla.png",
  "frostgun.png":       "frostgun.png",
  "fireworks.png":      "fireworks.png",
  "tornado.png":        "tornado.png",
};

function md5(path) {
  return createHash("md5").update(readFileSync(path)).digest("hex");
}

function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

let copied = 0;
let skippedSame = 0;
let missing = 0;
const PAD = 22;

for (const [srcName, destName] of Object.entries(MAPPING)) {
  const srcPath = join(SRC_DIR, srcName);
  const destPath = join(DEST_DIR, destName);

  if (!existsSync(srcPath)) {
    console.log(`-  ${srcName.padEnd(PAD)}  (not in src/image/, skipping)`);
    missing++;
    continue;
  }

  if (existsSync(destPath) && md5(srcPath) === md5(destPath)) {
    console.log(`=  ${srcName.padEnd(PAD)} -> ${destName}  (already up to date)`);
    skippedSame++;
    continue;
  }

  copyFileSync(srcPath, destPath);
  const size = fmtSize(statSync(destPath).size);
  console.log(`+  ${srcName.padEnd(PAD)} -> ${destName.padEnd(16)}  ${size}`);
  copied++;
}

console.log("");
console.log(`Done: ${copied} copied, ${skippedSame} unchanged, ${missing} missing.`);
