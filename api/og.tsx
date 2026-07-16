import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

export default async function handler() {
  const year = new Date().getFullYear();

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0f14',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Subtle grid pattern */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(92,200,232,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(92,200,232,0.04) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />

        {/* Radial glow */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(92,200,232,0.1) 0%, transparent 70%)',
          }}
        />

        {/* Accent line top */}
        <div
          style={{
            position: 'absolute',
            top: '0',
            left: '0',
            right: '0',
            height: '4px',
            background: 'linear-gradient(90deg, transparent, #5cc8e8, transparent)',
          }}
        />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            zIndex: 1,
          }}
        >
          {/* Logo text */}
          <div
            style={{
              fontSize: '64px',
              fontWeight: '700',
              color: '#ffffff',
              letterSpacing: '-1px',
              marginBottom: '12px',
            }}
          >
            Gtech{' '}
            <span style={{ color: '#5cc8e8' }}>Global</span>
          </div>

          {/* Divider */}
          <div
            style={{
              width: '80px',
              height: '3px',
              backgroundColor: '#5cc8e8',
              borderRadius: '2px',
              marginBottom: '24px',
            }}
          />

          {/* Tagline */}
          <div
            style={{
              fontSize: '24px',
              color: '#8899aa',
              textAlign: 'center',
              maxWidth: '700px',
              lineHeight: '1.4',
              marginBottom: '32px',
            }}
          >
            We craft premium web apps, mobile apps, and graphics design
          </div>

          {/* URL pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px 28px',
              borderRadius: '999px',
              border: '1.5px solid rgba(92,200,232,0.3)',
              backgroundColor: 'rgba(92,200,232,0.06)',
            }}
          >
            <div
              style={{
                fontSize: '18px',
                color: '#5cc8e8',
                fontWeight: '500',
              }}
            >
              gtechglobal.dev
            </div>
          </div>
        </div>

        {/* Bottom accent line */}
        <div
          style={{
            position: 'absolute',
            bottom: '0',
            left: '0',
            right: '0',
            height: '4px',
            background: 'linear-gradient(90deg, transparent, #5cc8e8, transparent)',
          }}
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
      },
    }
  );
}
