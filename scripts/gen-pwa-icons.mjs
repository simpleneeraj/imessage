// Generates the PWA home-screen icons (beige "f", matching the favicon) at the
// sizes the manifest references. The "f" sits at ~58% so it stays inside the
// maskable safe zone — Android rounds/crops the corners, and the solid beige
// background fills them cleanly. Run: node scripts/gen-pwa-icons.mjs
import { ImageResponse } from 'next/dist/compiled/@vercel/og/index.node.js';
import { writeFileSync } from 'node:fs';

const ALICE_TTF =
  'https://raw.githubusercontent.com/google/fonts/main/ofl/alice/Alice-Regular.ttf';
const font = await (await fetch(ALICE_TTF)).arrayBuffer();

async function render(px) {
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
          // ~58% keeps the glyph inside the maskable safe zone (center 80%)
          fontSize: Math.round(px * 0.58),
          fontWeight: 400,
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

async function renderBadge(px) {
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
          color: '#ffffff',
          fontFamily: 'Alice',
          // Badges don't have to fit maskable safety zones, so make it a bit larger
          fontSize: Math.round(px * 0.72),
          fontWeight: 400,
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

for (const px of [192, 512]) {
  const buf = await render(px);
  writeFileSync(new URL(`../public/logo/icon-${px}.png`, import.meta.url), buf);
  console.log(`wrote public/logo/icon-${px}.png (${buf.length} bytes)`);
}

const badgeBuf = await renderBadge(96);
writeFileSync(new URL('../public/logo/badge-96.png', import.meta.url), badgeBuf);
console.log(`wrote public/logo/badge-96.png (${badgeBuf.length} bytes)`);

