// Generates icon16/32/48/128 PNGs from a single SVG source using sharp.
// Runs as part of npm run build — no manual image editing required.

import sharp from 'sharp';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = join(__dirname, '..', 'public', 'icons');

// Minimal modern "bolt" mark on a rounded gradient square.
const SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#6366F1"/>
      <stop offset="100%" stop-color="#8B5CF6"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="28" fill="url(#bg)"/>
  <path d="M70 24 L40 72 L60 72 L54 104 L88 56 L68 56 L74 24 Z"
        fill="#FFFFFF"
        stroke="#FFFFFF"
        stroke-width="2"
        stroke-linejoin="round"/>
</svg>`;

const SIZES = [16, 32, 48, 128];

async function main() {
  if (!existsSync(ICONS_DIR)) {
    mkdirSync(ICONS_DIR, { recursive: true });
  }

  writeFileSync(join(ICONS_DIR, 'icon.svg'), SVG);

  for (const size of SIZES) {
    const outPath = join(ICONS_DIR, `icon${size}.png`);
    await sharp(Buffer.from(SVG))
      .resize(size, size)
      .png({ compressionLevel: 9 })
      .toFile(outPath);
    // eslint-disable-next-line no-console
    console.log(`✓ ${outPath}`);
  }
}

main().catch((err) => {
  console.error('Icon generation failed:', err);
  process.exit(1);
});
