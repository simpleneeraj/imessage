import { ImageResponse } from 'next/og';

// Apple touch icon — same gold "crown" palette + Alice (brand serif).
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

const ALICE_TTF =
  'https://raw.githubusercontent.com/google/fonts/main/ofl/alice/Alice-Regular.ttf';
async function loadAlice(): Promise<ArrayBuffer> {
  return (await fetch(ALICE_TTF)).arrayBuffer();
}

export default async function AppleIcon() {
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
        fontSize: 130,
        fontWeight: 400,
        borderRadius: '16px',
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
