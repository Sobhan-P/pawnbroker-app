import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export function GET(req: NextRequest) {
  const size = parseInt(req.nextUrl.searchParams.get('size') || '192');
  const fontSize = Math.round(size * 0.38);

  return new ImageResponse(
    (
      <div
        style={{
          background: '#f59e0b',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            color: '#1d4ed8',
            fontSize,
            fontWeight: 'bold',
            fontFamily: 'sans-serif',
            letterSpacing: '-2px',
          }}
        >
          PB
        </span>
      </div>
    ),
    { width: size, height: size }
  );
}
