// Generates app/favicon.ico to match the dynamic app/icon.tsx (gold "F").
// Next can't dynamically generate .ico, so we render PNGs with the same design
// (next/og) and pack them into a multi-size ICO. Run: node scripts/gen-favicon.mjs
import { ImageResponse } from 'next/dist/compiled/@vercel/og/index.node.js';
import { writeFileSync } from 'node:fs';

const ALICE_TTF =
  'https://raw.githubusercontent.com/google/fonts/main/ofl/alice/Alice-Regular.ttf';
const font = await (await fetch(ALICE_TTF)).arrayBuffer();

async function renderPng(px) {
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
          background: '#e9e2d7',
          color: '#1b1a16',
          fontFamily: 'Alice',
          fontSize: Math.round(px * 0.76),
          fontWeight: 400,
          borderRadius: `${Math.round(px * 0.22)}px`,
        },
        children: 'f',
      },
    },
    {
      width: px,
      height: px,
      fonts: [{ name: 'Alice', data: font, weight: 400, style: 'normal' }],
    },
  );
  return Buffer.from(await res.arrayBuffer());
}

// Pack PNG buffers into an ICO (PNG-embedded entries; supported by all modern browsers).
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
    e.writeUInt8(0, 2); // colors
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // planes
    e.writeUInt16LE(32, 6); // bit depth
    e.writeUInt32LE(data.length, 8); // size of PNG
    e.writeUInt32LE(offset, 12); // offset
    entries.push(e);
    offset += data.length;
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

const sizes = [16, 32, 48];
const images = [];
for (const size of sizes) images.push({ size, data: await renderPng(size) });

const ico = buildIco(images);
writeFileSync(new URL('../app/favicon.ico', import.meta.url), ico);
console.log(
  `Wrote app/favicon.ico (${ico.length} bytes; sizes ${sizes.join(', ')})`,
);
