/**
 * Generates the PWA PNG icons from a font-free geometric mark (a speech bubble
 * with an umlaut + text line — "German language"). Run with:
 *
 *   npm i -D @resvg/resvg-js && node scripts/generate-icons.mjs
 *
 * The generated PNGs live in public/icons and are committed, so this only needs
 * to run when the brand mark changes.
 */
import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, writeFileSync } from 'node:fs';

const GRAD = `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7c6dfc"/><stop offset="1" stop-color="#4f46e5"/></linearGradient></defs>`;

const MARK = `
  <path d="M128 128 h256 a48 48 0 0 1 48 48 v120 a48 48 0 0 1 -48 48 H236 l-72 64 v-64 h-36 a48 48 0 0 1 -48 -48 V176 a48 48 0 0 1 48 -48 Z" fill="#ffffff"/>
  <circle cx="212" cy="212" r="22" fill="#4f46e5"/>
  <circle cx="300" cy="212" r="22" fill="#4f46e5"/>
  <rect x="176" y="266" width="160" height="30" rx="15" fill="#c7d2fe"/>`;

const normal = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${GRAD}<rect width="512" height="512" rx="116" fill="url(#g)"/>${MARK}</svg>`;

const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${GRAD}<rect width="512" height="512" fill="url(#g)"/><g transform="translate(256 256) scale(0.68) translate(-256 -256)">${MARK}</g></svg>`;

function render(svg, size, out) {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: size } });
  writeFileSync(out, resvg.render().asPng());
  console.log('wrote', out);
}

mkdirSync('public/icons', { recursive: true });
render(normal, 192, 'public/icons/icon-192.png');
render(normal, 512, 'public/icons/icon-512.png');
render(maskable, 512, 'public/icons/icon-512-maskable.png');
writeFileSync('public/favicon.svg', normal + '\n');
console.log('wrote public/favicon.svg');
