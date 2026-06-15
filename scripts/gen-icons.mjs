// Generates the full brand icon set from a single source design: the beige "f"
// mark in Alice (the brand Google serif). Run: node scripts/gen-icons.mjs
//
// Outputs:
//   app/favicon.ico                     — multi-size .ico (rounded), browser tabs
//   public/logo/icon-{192,512}.png      — manifest "any" icons (full-bleed square)
//   public/logo/icon-{192,512}-maskable.png — Android adaptive (glyph in safe zone)
//   public/logo/badge-96.png            — monochrome notification badge (transparent)
//
// Next can't emit a static .ico and the maskable safe-zone padding differs per
// purpose, so we render every variant here with next/og and write them to disk.
import { ImageResponse } from 'next/dist/compiled/@vercel/og/index.node.js';
import { mkdirSync, writeFileSync } from 'node:fs';

// Alice as raw TTF — satori needs ttf/otf, not the woff2 the CSS endpoint serves.
const ALICE_TTF =
  'https://raw.githubusercontent.com/google/fonts/main/ofl/alice/Alice-Regular.ttf';
const fontData = await (await fetch(ALICE_TTF)).arrayBuffer();
const fonts = [{ name: 'Alice', data: fontData, weight: 400, style: 'normal' }];

// Brand palette — shared across favicon, app/icon.tsx and app/apple-icon.tsx.
const BEIGE = '#e9e2d7';
const INK = '#1b1a16';

/**
 * Render one square "f" tile to a PNG buffer.
 * @param {number} px           output size in pixels
 * @param {object} [opts]
 * @param {number} [opts.scale] glyph size as a fraction of px
 * @param {string} [opts.bg]    background fill
 * @param {string} [opts.fg]    glyph color
 * @param {number} [opts.radius] corner radius as a fraction of px (0 = square)
 */
async function tile(px, { scale = 0.62, bg = BEIGE, fg = INK, radius = 0 } = {}) {
  const res = new ImageResponse(
    {
      type: 'div',
      props: {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: bg,
          color: fg,
          fontFamily: 'Alice',
          fontSize: Math.round(px * scale),
          fontWeight: 400,
          lineHeight: 1,
          ...(radius ? { borderRadius: `${Math.round(px * radius)}px` } : {}),
        },
        children: 'f',
      },
    },
    { width: px, height: px, fonts },
  );
  return Buffer.from(await res.arrayBuffer());
}

// Render the notification badge: a solid white octocat on transparent. Android
// (and Chrome) draw the badge as a tiny ~24dp monochrome icon using ONLY the
// alpha channel, so it must be a bold, simple silhouette — a thin serif glyph
// would disappear. The octocat fills the frame and reads at any size.
async function badge(px) {
  const octocat =
    'M178.4 287.5c-9.1 0-16.9 4.2-23.2 12.8-6.3 8.5-9.4 19-9.4 31.4 0 12.5 3.2 23 9.4 31.5 6.3 8.5 14 12.8 23.2 12.8 8.5 0 15.9-4.3 22.1-12.8 6.3-8.5 9.4-19 9.4-31.5 0-12.4-3.2-22.9-9.4-31.4-6.3-8.6-13.6-12.8-22.1-12.8zM334.7 287.5c-9 0-16.9 4.2-23.2 12.8-6.3 8.5-9.4 19-9.4 31.4 0 12.5 3.2 23 9.4 31.5 6.3 8.5 14.1 12.8 23.2 12.8 8.5 0 15.9-4.3 22.2-12.8 6.3-8.5 9.4-19 9.4-31.5 0-12.4-3.2-22.9-9.4-31.4-6.3-8.6-13.6-12.8-22.2-12.8z' +
    'M445.8 172c-.1 0 2.7-14.3.3-39.2-2.2-24.9-7.5-47.8-16.1-68.8 0 0-4.4.8-12.8 2.9s-22.1 6.3-40.9 14.8c-18.5 8.5-38 19.8-58.3 33.5-13.8-3.9-34.4-5.9-62-5.9-26.3 0-46.9 2-62 5.9-44.6-30.9-81.9-48-112.1-51.2-8.6 21-13.9 44-16 69-2.4 24.9.4 39.3.4 39.3C42 198.6 32 236.5 32 267.8c0 24.2.7 46.1 6.1 65.5 5.6 19.3 12.7 35.1 21.1 47.2 8.6 12.1 19 22.8 31.6 31.9 12.5 9.3 24 16 34.4 20.2 10.5 4.4 22.4 7.6 36 9.9 13.3 2.4 23.4 3.6 30.5 4 0 0 28 1.5 64.4 1.5s64.3-1.5 64.3-1.5c7-.4 17.1-1.6 30.5-4 13.5-2.3 25.5-5.6 35.9-9.9 10.4-4.3 21.9-10.9 34.5-20.2 12.5-9 22.9-19.7 31.5-31.9 8.4-12.1 15.5-27.9 21.1-47.2 5.5-19.4 6.1-41.4 6.1-65.6 0-30.3-10-68.7-34.2-95.7zm-65.4 233.6c-27.9 13.1-68.9 18.4-123.3 18.4H255c-54.4 0-95.4-5.2-122.8-18.4-27.5-13.1-41.3-40.1-41.3-80.7 0-24.3 8.6-44 25.5-59.1 7.4-6.5 16.4-11 27.6-13.7 11.1-2.6 21.4-2.8 31-2.5 9.4.4 22.6 2.2 39.3 3.5 16.8 1.3 29.3 3 41.8 3 11.7 0 27.2-2 52.1-4 25-2 43.5-3 55.5-1 12.3 2 23 6.2 32.1 14.7 17.7 15.8 26.6 35.5 26.6 59.1-.1 40.6-14.2 67.6-42 80.7z';
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">` +
    `<path d="${octocat}" fill="#ffffff"/></svg>`;
  const res = new ImageResponse(
    {
      type: 'div',
      props: {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
        },
        children: {
          type: 'img',
          props: {
            width: Math.round(px * 0.82),
            height: Math.round(px * 0.82),
            src: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
          },
        },
      },
    },
    { width: px, height: px },
  );
  return Buffer.from(await res.arrayBuffer());
}

// Pack PNG buffers into a single .ico (PNG-embedded entries; all modern browsers).
function buildIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4); // count

  const entries = [];
  let offset = 6 + images.length * 16;
  for (const { size, data } of images) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0); // width
    e.writeUInt8(size >= 256 ? 0 : size, 1); // height
    e.writeUInt8(0, 2); // palette colors
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // color planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(data.length, 8); // PNG byte length
    e.writeUInt32LE(offset, 12); // PNG byte offset
    entries.push(e);
    offset += data.length;
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

const root = new URL('..', import.meta.url);
const logoDir = new URL('public/logo/', root);
mkdirSync(logoDir, { recursive: true });

const write = (relPath, buf, label = relPath) => {
  writeFileSync(new URL(relPath, root), buf);
  console.log(`wrote ${label} (${buf.length.toLocaleString()} bytes)`);
};

// 1. favicon.ico — rounded tile, slightly larger glyph for legibility at 16px.
const icoSizes = [16, 32, 48];
const icoImages = await Promise.all(
  icoSizes.map(async (size) => ({
    size,
    data: await tile(size, { scale: 0.76, radius: 0.22 }),
  })),
);
write('app/favicon.ico', buildIco(icoImages), `app/favicon.ico (${icoSizes.join(', ')})`);

// 2. "any" icons — full-bleed square; the platform decides any masking.
for (const px of [192, 512]) {
  write(`public/logo/icon-${px}.png`, await tile(px, { scale: 0.62 }));
}

// 3. maskable icons — glyph at ~52% so it stays inside the center-80% safe zone
//    Android crops to (circle / squircle / rounded-square).
for (const px of [192, 512]) {
  write(
    `public/logo/icon-${px}-maskable.png`,
    await tile(px, { scale: 0.52 }),
  );
}

// 4. notification badge — solid white heart silhouette on transparent (tinted).
write('public/logo/badge-96.png', await badge(96));

console.log('\n✓ icon set generated');
