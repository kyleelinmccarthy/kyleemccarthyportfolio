const isProduction = process.env.NODE_ENV === 'production'

const turnstile = 'https://challenges.cloudflare.com'

/**
 * The Content-Security-Policy, as directive -> sources.
 *
 * The pages are statically generated, so there is no per-request nonce: inline
 * scripts (the theme initialiser, JSON-LD, Next's own bootstrap) need
 * 'unsafe-inline'. Vercel Analytics and Speed Insights load from the site's own
 * origin (/_vercel/...), so 'self' covers them. Turnstile needs its script,
 * its iframe and its verification request. Next's dev server needs 'unsafe-eval'.
 */
const contentSecurityPolicy = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", ...(isProduction ? [] : ["'unsafe-eval'"]), turnstile],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'blob:'],
  'font-src': ["'self'"],
  'connect-src': ["'self'", turnstile],
  'frame-src': [turnstile],
  'worker-src': ["'self'", 'blob:'],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'self'"],
}

const contentSecurityPolicyHeader = Object.entries(contentSecurityPolicy)
  .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
  .join('; ')

/** The pages of the retired house, sent to where their content lives now. */
const retiredPages = [
  { source: '/about', destination: '/places/home' },
  { source: '/connect', destination: '/places/post' },
  { source: '/room', destination: '/places/art' },
  { source: '/work', destination: '/#index' },
]

/**
 * The e2e suite builds with test keys, the test hooks and `NEXT_PUBLIC_SITE_URL` pointing at its own port
 * (see playwright.config.ts). Those builds go in their own folder, so a later plain `npm start` or
 * `npm run capture:poster -- --no-build` serves the ordinary build in `.next`, never the test one.
 */
const distDir = process.env.NEXT_PUBLIC_E2E === '1' ? '.next-e2e' : '.next'

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir,
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  async redirects() {
    return retiredPages.map((page) => ({ ...page, permanent: true }))
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Content-Security-Policy', value: contentSecurityPolicyHeader },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}

export default nextConfig
