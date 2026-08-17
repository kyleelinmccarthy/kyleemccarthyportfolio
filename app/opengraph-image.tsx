import { ImageResponse } from 'next/og'
import { hero } from '@/content/hero'

export const runtime = 'edge'
export const alt = 'Kylee McCarthy — Technology Leader, Builder & Designer'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          backgroundColor: '#1B211C',
          backgroundImage:
            'radial-gradient(circle at 85% 15%, rgba(47,59,49,0.85), transparent 55%)',
        }}
      >
        <div
          style={{
            fontSize: 26,
            letterSpacing: 6,
            textTransform: 'uppercase',
            color: '#CCC2B8',
          }}
        >
          Kylee McCarthy, MS
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 60,
            lineHeight: 1.08,
            fontWeight: 700,
            color: '#E9D5BD',
            maxWidth: 1040,
          }}
        >
          {hero.headline}
        </div>
        <div style={{ marginTop: 40, display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 80, height: 5, backgroundColor: '#CCC2B8' }} />
          <div style={{ fontSize: 30, color: '#C2B29A' }}>
            Technology Leadership · AI · Product & UX
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
