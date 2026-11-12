import { ImageResponse } from 'next/og'
import { shareColors, shareSky } from '@/lib/shareImage'

// Browser-tab favicon: a bold "K" in ink on the afternoon sky.
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundImage: shareSky,
          color: shareColors.ink,
          borderRadius: 6,
          fontSize: 24,
          fontWeight: 800,
          lineHeight: 1,
        }}
      >
        K
      </div>
    ),
    { ...size }
  )
}
