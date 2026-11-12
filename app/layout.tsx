import type { Metadata, Viewport } from 'next'
import { Bricolage_Grotesque, DM_Mono, DM_Sans } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { ThemeProvider } from '@/components/hud/ThemeProvider'
import { site } from '@/content/site'
import { looks } from '@/content/sky'
import { personJsonLd } from '@/lib/structuredData'
import { themeInitScript } from '@/lib/theme'
import { testHooksOn } from '@/lib/world/quality'
import './globals.css'

// Self-hosted via next/font — no third-party request, size-adjusted to avoid CLS.
const display = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})
const sans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})
const mono = DM_Mono({
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: site.title,
    template: `%s — ${site.shortTitle}`,
  },
  description: site.description,
  applicationName: site.shortTitle,
  authors: [{ name: site.name, url: site.url }],
  creator: site.name,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: site.locale,
    url: site.url,
    title: site.title,
    description: site.description,
    siteName: site.shortTitle,
  },
  twitter: {
    card: 'summary_large_image',
    title: site.title,
    description: site.description,
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: looks.night.top },
    { media: '(prefers-color-scheme: light)', color: looks.afternoon.top },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      // Marks a build made for the e2e suite, which the suite checks for (see tests/e2e/global-setup.ts). Absent otherwise.
      data-e2e={testHooksOn(process.env.NEXT_PUBLIC_E2E) ? '' : undefined}
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
    >
      <head>
        {/* Set theme before first paint to prevent FOUC. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript() }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd()) }}
        />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider>{children}</ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
