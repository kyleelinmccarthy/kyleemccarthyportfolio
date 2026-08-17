import type { Metadata, Viewport } from 'next'
import { Bentham, Bellota_Text, Give_You_Glory, Sacramento } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { site } from '@/content/site'
import { personJsonLd } from '@/lib/structuredData'
import { themeInitScript } from '@/lib/theme'
import './globals.css'

// Self-hosted via next/font — no third-party request, size-adjusted to avoid CLS.
const bentham = Bentham({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bentham',
  display: 'swap',
})
const bellota = Bellota_Text({
  weight: ['300', '400', '700'],
  subsets: ['latin'],
  variable: '--font-bellota',
  display: 'swap',
})
const giveYouGlory = Give_You_Glory({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-give-you-glory',
  display: 'swap',
})
const sacramento = Sacramento({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-sacramento',
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
    { media: '(prefers-color-scheme: dark)', color: '#1B211C' },
    { media: '(prefers-color-scheme: light)', color: '#F5F5F4' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${bentham.variable} ${bellota.variable} ${giveYouGlory.variable} ${sacramento.variable}`}
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
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
