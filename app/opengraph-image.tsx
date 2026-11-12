import { ImageResponse } from 'next/og'
import { hero } from '@/content/about'
import { site } from '@/content/site'
import { shareColors, shareImage, shareSky } from '@/lib/shareImage'

export const runtime = 'edge'
export const alt = shareImage.alt
export const size = { width: shareImage.width, height: shareImage.height }
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
          backgroundImage: shareSky,
          color: shareColors.ink,
        }}
      >
        <div style={{ fontSize: 76, fontWeight: 800, letterSpacing: -2, lineHeight: 1 }}>
          {site.name}
        </div>
        <div style={{ marginTop: 28, fontSize: 26, letterSpacing: 4, textTransform: 'uppercase' }}>
          {site.roleLine}
        </div>
        <div
          style={{
            marginTop: 48,
            maxWidth: 940,
            fontSize: 48,
            fontWeight: 500,
            lineHeight: 1.18,
          }}
        >
          {hero.headline}
        </div>
      </div>
    ),
    { ...size }
  )
}
