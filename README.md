# kyleemccarthy.com

Personal portfolio for **Kylee McCarthy, MS** — Director of Technology Operations.
Single statically-rendered page + one dynamic contact route.

- **Stack:** Next.js (App Router) + TypeScript · Tailwind CSS · Framer Motion · Resend · Cloudflare Turnstile
- **Hosting:** Vercel Hobby (free) + Web Analytics + Speed Insights
- **Content:** typed modules in [`content/`](content/) — edit there, no CMS/DB
- **Tests:** Vitest + React Testing Library (unit) · Playwright + axe (e2e/a11y)

---

## Local development

```bash
npm install
cp .env.local.example .env.local   # already created with Turnstile TEST keys
npm run dev                         # http://localhost:3000
```

`.env.local` ships with Cloudflare's **test** Turnstile keys (always pass) and an
empty `RESEND_API_KEY`. With no Resend key the contact form reaches the server and
returns the graceful "email me directly" fallback — wire a real key to send mail.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (next/core-web-vitals) |
| `npm test` | Vitest unit suite |
| `npm run test:e2e` | Playwright e2e + axe (needs browsers, see below) |
| `npm run process:headshot` | Regenerate the duotone portrait from the source selfie |
| `npm run capture:screenshots` | Capture project screenshots (needs browsers) |

### Running e2e / a11y locally

The Playwright browsers need system libraries. Once per machine:

```bash
npx playwright install --with-deps chromium   # needs sudo for system libs
npm run test:e2e
```

CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) installs these
automatically and runs typecheck + lint + unit + e2e/axe on every push/PR.

---

## Editing content

Everything visible on the site comes from typed modules — change copy here, never in components:

| File | Section |
|---|---|
| [`content/site.ts`](content/site.ts) | Name, title, URLs, résumé path, JSON-LD facts |
| [`content/hero.ts`](content/hero.ts) | Hero headline / subhead / CTAs |
| [`content/stats.ts`](content/stats.ts) · [`content/metrics.ts`](content/metrics.ts) | Stat bands |
| [`content/about.ts`](content/about.ts) | About prose + pull quote |
| [`content/services.ts`](content/services.ts) | What I Do |
| [`content/projects.ts`](content/projects.ts) | Work grid (add a project = add an object) |
| [`content/philosophy.ts`](content/philosophy.ts) | Leadership principles |
| [`content/contact.ts`](content/contact.ts) · [`content/contactOptions.ts`](content/contactOptions.ts) | Contact copy + inquiry dropdown |

Adding a project: append a typed `Project` to `projects.ts`. If it has a `liveUrl`
and a captured screenshot in `public/screenshots/`, the card shows the screenshot;
otherwise it renders an on-brand abstract panel automatically.

---

## Assets

- **Portrait:** `npm run process:headshot` reads `Snapchat-351522414.jpg`, crops to
  face/shoulders, and bakes a blackberry→terracotta→cream tritone + vignette into
  `public/kylee-portrait.{jpg,avif}`. The raw selfie is git-ignored.
- **Résumé:** `public/Kylee-McCarthy-Resume.pdf` (linked from nav). Replace this file to update.
- **Project screenshots:** `npm run capture:screenshots` captures the three public
  sites (403HQ, NBS, Ember) into `public/screenshots/`. Safe to commit.

---

## Deploy (Vercel Hobby)

1. Push to GitHub, import the repo at vercel.com (personal/Hobby account).
2. Add **environment variables** (Production + Preview):

   | Variable | Value |
   |---|---|
   | `RESEND_API_KEY` | from resend.com/api-keys |
   | `CONTACT_TO_EMAIL` | `kyleelinmccarthy@gmail.com` |
   | `CONTACT_FROM_EMAIL` | `Kylee McCarthy <noreply@kyleemccarthy.com>` |
   | `TURNSTILE_SECRET_KEY` | Turnstile widget secret |
   | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Turnstile widget site key |
   | `NEXT_PUBLIC_SITE_URL` | `https://kyleemccarthy.com` |

3. Add the domain `kyleemccarthy.com` in Vercel → Domains (apex + `www` redirect).
4. Enable **Web Analytics** and **Speed Insights** in the Vercel dashboard (one click each).

### Resend domain verification (so mail isn't marked spam)

1. resend.com → Domains → add `kyleemccarthy.com` (or a `send.` subdomain).
2. Add the **SPF (TXT)**, **DKIM (TXT/CNAME)**, and **DMARC (TXT)** records Resend
   shows you to the domain's DNS (Vercel DNS or your registrar).
3. Wait for **Verified**, then confirm `CONTACT_FROM_EMAIL` uses that domain.

### Cloudflare Turnstile

dash.cloudflare.com → Turnstile → add a widget for `kyleemccarthy.com`.
Copy the **site key** → `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, **secret key** → `TURNSTILE_SECRET_KEY`.

### Gmail filter (recommended)

So legitimate inquiries always surface (bots are already blocked upstream):

> Settings → Filters → Create. **Subject contains** `[kyleemccarthy.com]` →
> Apply label **Portfolio**, **Mark as important**, **Star it**,
> **Never send to spam**, **Categorize as Primary**.

Replies go straight to the sender (the email's `Reply-To` is their address).

---

## How the contact pipeline is hardened

`POST /api/contact` ([route](app/api/contact/route.ts) → pure
[handler](lib/contact/handler.ts)), in order, failing closed but never losing a
real message silently:

1. **Rate limit** per IP (5 / 10 min, in-memory) → `429`
2. **Honeypot** (`company_url`) filled → silent `200` (dropped)
3. **Zod** validation → `400` with inline field errors
4. **Turnstile** server verification → `400`
5. **Heuristics** (too many links / disposable domain / shouty) → `422` "email me directly"
6. **Resend** send; any failure → `502` "email me directly"

> The rate limiter is best-effort (resets on serverless cold start) by design —
> Turnstile + honeypot + heuristics are the real gate. Upgrade path if ever needed:
> swap `lib/contact/rateLimit.ts` for Vercel KV. No database required.
