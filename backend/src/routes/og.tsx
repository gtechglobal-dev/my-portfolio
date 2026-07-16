import { Router, Request, Response } from 'express';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const router = Router();

let interRegular: ArrayBuffer | null = null;
let interBold: ArrayBuffer | null = null;

async function loadFonts() {
  if (interRegular && interBold) return;
  const [regular, bold] = await Promise.all([
    fetch('https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hjQ.woff2').then(r => r.arrayBuffer()),
    fetch('https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYAZ9hjQ.woff2').then(r => r.arrayBuffer()),
  ]);
  interRegular = regular;
  interBold = bold;
}

let cachedImage: Buffer | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000;

function renderOgImage() {
  return (
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
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(92,200,232,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(92,200,232,0.04) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(92,200,232,0.1) 0%, transparent 70%)',
        }}
      />

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

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 1,
        }}
      >
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

        <div
          style={{
            width: '80px',
            height: '3px',
            backgroundColor: '#5cc8e8',
            borderRadius: '2px',
            marginBottom: '24px',
          }}
        />

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
  );
}

async function generateImage(): Promise<Buffer> {
  const now = Date.now();
  if (cachedImage && now - cacheTimestamp < CACHE_TTL) {
    return cachedImage;
  }

  await loadFonts();

  const svg = await satori(renderOgImage(), {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Inter', data: interRegular!, style: 'normal', weight: 400 },
      { name: 'Inter', data: interBold!, style: 'normal', weight: 700 },
    ],
  });

  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  cachedImage = Buffer.from(pngBuffer);
  cacheTimestamp = now;
  return cachedImage;
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const image = await generateImage();
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800');
    res.send(image);
  } catch (err: any) {
    console.error('OG image generation failed:', err.message);
    res.status(500).json({ error: 'Failed to generate OG image' });
  }
});

export default router;
