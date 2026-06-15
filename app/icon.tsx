import { ImageResponse } from 'next/og';

// Dynamic favicon/icon — gold "crown" palette + Alice (brand Google serif).
export const size = { width: 48, height: 48 };
export const contentType = 'image/png';

// Alice as raw TTF (satori needs ttf/otf, not the woff2 the CSS endpoint serves).
const ALICE_TTF =
  'https://raw.githubusercontent.com/google/fonts/main/ofl/alice/Alice-Regular.ttf';
async function loadAlice(): Promise<ArrayBuffer> {
  return (await fetch(ALICE_TTF)).arrayBuffer();
}

export default async function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#e9e2d7',
        color: '#1b1a16',
        fontFamily: 'Alice',
        fontSize: 36,
        fontWeight: 400,
        borderRadius: '12px',
      }}
    >
      f
    </div>,
    {
      ...size,
      fonts: [
        {
          name: 'Alice',
          data: await loadAlice(),
          weight: 400,
          style: 'normal',
        },
      ],
    },
  );
}
