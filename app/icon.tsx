import { ImageResponse } from 'next/og'
import { readFileSync } from 'fs'
import { join } from 'path'

// Browser-tab favicon. The "KM" monogram reuses the wordmark's letterforms:
// in NameLogo the capital "K" and the "M" of McCarthy are both set in
// Give You Glory, so the tab icon echoes the signature rather than a generic
// sans glyph. Cream on blackberry = the site's dark-theme signature pairing,
// which stays legible against both light and dark browser chrome.
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

const giveYouGlory = readFileSync(
  join(process.cwd(), 'app/_assets/GiveYouGlory.ttf')
)

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
          backgroundColor: '#12121C',
          // Soft terracotta glow, mirroring the OG image's brand accent.
          backgroundImage:
            'radial-gradient(circle at 70% 25%, rgba(191,77,58,0.55), transparent 70%)',
          borderRadius: 6,
        }}
      >
        <div
          style={{
            display: 'flex',
            fontFamily: 'Give You Glory',
            fontSize: 18,
            lineHeight: 1,
            color: '#E9D5BD',
            // The script capitals are wide with swashes that overhang their
            // advance box, so keep the pair small enough that the K's left foot
            // and the M's right arm clear the frame; drop it onto the optical
            // centre rather than riding the top edge.
            letterSpacing: 0,
            transform: 'translateY(2px)',
          }}
        >
          KM
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: 'Give You Glory',
          data: giveYouGlory,
          weight: 400,
          style: 'normal',
        },
      ],
    }
  )
}
