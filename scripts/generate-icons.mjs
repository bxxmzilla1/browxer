/**
 * Generates minimal placeholder PWA icons as SVG-embedded PNGs using only
 * Node built-ins (no native canvas required).
 *
 * Usage: node scripts/generate-icons.mjs
 *
 * This creates simple purple-hexagon icons. Replace with real artwork before
 * publishing.
 */

import { writeFileSync, mkdirSync } from 'fs';

// Minimal 1x1 purple PNG (base64 placeholder)
// Real icon generation via Canvas is done with: npm install canvas
// then uncomment the canvas section below.

const SVG = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#0f0f13"/>
  <polygon points="${hexPoints(size / 2, size / 2, size * 0.38)}" fill="#7c3aed"/>
  <text x="${size / 2}" y="${size / 2 + size * 0.07}" text-anchor="middle"
        font-family="system-ui" font-size="${size * 0.28}" font-weight="bold" fill="white">G</text>
</svg>`;

function hexPoints(cx, cy, r) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(' ');
}

mkdirSync('client/public/icons', { recursive: true });
writeFileSync('client/public/icons/icon-192.svg', SVG(192));
writeFileSync('client/public/icons/icon-512.svg', SVG(512));

// Also write a tiny 1x1 transparent PNG so the manifest refs don't 404
// (browsers gracefully ignore wrong-size icons)
const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);
writeFileSync('client/public/icons/icon-192.png', PNG_1x1);
writeFileSync('client/public/icons/icon-512.png', PNG_1x1);

console.log('Placeholder icons written to client/public/icons/');
console.log('Replace .png files with real artwork before production.');
