# kyleemccarthy.com

Personal portfolio for **Kylee McCarthy, MS** — Director of Technology Operations.
The site is a small interactive planet: five districts, nineteen places, each
with its own landmark modelled in code. Click a landmark (or take the tour) and
its panel opens beside it.

- **Stack:** Next.js 15 (App Router) + React 19 + TypeScript · three.js r187 with @react-three/fiber 9 (no drei) · Tailwind CSS · Resend · Cloudflare Turnstile
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

Every place has its own address: `/places/<id>` (for example `/places/beacon`)
opens the planet at that place with its panel; the panel reads and its links
work while the 3D code loads, or if it fails.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (next/core-web-vitals) |
| `npm test` | Vitest unit suite (content, the planet's maths, every landmark's checks) |
| `npm run test:e2e` | Playwright e2e + axe on desktop and phone (needs browsers, see below) |
| `npm run capture:poster` | Retakes the planet's fallback pictures, `public/world/poster-{day,night}.webp` |
| `npm run capture:screenshots` | Captures project heroes from their public sites |
| `npm run capture:realm` | Captures the Realm from a local Kingdoms & Crowns in demo mode (see the script's header) |
| `npm run import:art` / `npm run import:assets` | Re-encode art and project images through the shared image ladder |
| `npm run process:portrait` / `npm run process:nav-avatar` | Regenerate the portrait and the nav avatar |

### Running e2e / a11y locally

The Playwright browsers need system libraries. Once per machine:

```bash
npx playwright install --with-deps chromium   # needs sudo for system libs
npm run test:e2e
```

`npm run test:e2e` builds the site itself into `.next-e2e` (so it never mixes
with a normal build in `.next`) and starts it with the test environment it
needs from `playwright.config.ts`: nothing has to be exported first. The 3D
scene is drawn at half resolution in these runs (a documented test hook,
`window.__worldRenderScale`), since headless browsers draw in software.

CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) installs these
automatically and runs typecheck + lint + unit + e2e/axe on every push/PR, and
`npm audit` at `--audit-level=critical`.

### Capture scripts

- **`capture:poster`** builds the site, opens it at 14:00 and 23:00 with the
  clock fixed, at full quality, and saves the planet as the two WebP pictures
  shown while the 3D code loads, or instead of it where WebGL is missing. Each
  must stay under 250 KB; the script steps the quality down until it fits, and
  refuses to write if the world dropped below full quality during the shot.
- **`capture:screenshots`** shoots the `autoCapture` projects' live sites.
- **`capture:realm`** shoots the Realm from a local copy of Kingdoms & Crowns
  running in demo mode.

All three encode through [`scripts/lib/imageLadder.ts`](scripts/lib/imageLadder.ts)
or its WebP equivalent, so every committed picture has the same size budget.
Look at every captured picture before committing it.

---

## How the world is organised

| Where | What |
|---|---|
| [`content/world.ts`](content/world.ts) | The five districts (name, blurb, colour, where on the planet) and the nineteen places (district, name, descriptor, latitude and longitude, landmark model, height, what its panel shows, weather, poster). The tour follows this order. |
| [`content/sky.ts`](content/sky.ts) | The look: the four skies (morning, afternoon, evening, night), the greetings, the constellations, and the landmark palette every model takes its colours from. |
| [`content/projects.ts`](content/projects.ts), [`about.ts`](content/about.ts), [`principles.ts`](content/principles.ts), [`interests.ts`](content/interests.ts), [`art.ts`](content/art.ts), [`contact.ts`](content/contact.ts), [`onTheGo.ts`](content/onTheGo.ts) | What the panels say. All visible copy lives in `content/`, never in a component. |
| [`app/(world)/`](app/(world)/) | The planet page and `/places/[id]`. |
| [`components/world/`](components/world/) | The 3D scene: planet, sky, clouds, camera rig, labels, effects. |
| [`components/world/models/`](components/world/models/) | The landmarks and the modelling kit (`kit.tsx`) they are built from. **Read its [README](components/world/models/README.md) before touching a model**: the parts table, the rules, the footprints and the budgets. |
| [`components/panels/`](components/panels/), [`components/hud/`](components/hud/) | The panel beside a place, and the heading, tour bar, index and legend over the planet. |
| [`lib/world/`](lib/world/) | Pure maths for the world (geometry, camera poses, labels, scatter, the kit's meshes): three's maths classes only, no React and no DOM, so it is all unit tested. |

### Budgets

The world is drawn on phones too, so the landmarks have budgets, all tested
over every place (`lib/world/kit.ts`):

- **Triangles:** at most **24,000** for any one landmark, outlines included,
  and **380,000** for all nineteen together.
- **Draw calls:** at most **45** for one landmark once its still parts are
  batched, and **760** for all nineteen.

Today the nineteen landmarks draw about 332,000 triangles in 475 calls.

### Adding a place

1. **The project.** If the place shows a project, add it to
   [`content/projects.ts`](content/projects.ts) (a typed `Project`; its images
   under `public/media/<slug>/`, each with alt text).
2. **The place.** Add an entry to `places` in
   [`content/world.ts`](content/world.ts): its id (which becomes
   `/places/<id>`), district, name and descriptor, its position (`at`, in
   degrees: at least 9° from every other place, on land, inside its district),
   a `model` key and its `height`, and `content` (for a project,
   `{ kind: 'project', slug }`). The key can be an existing landmark's, or
   `generic`, the plain building every key falls back to; one test ("leaves
   no place on the generic building") then fails on purpose until the place
   has a landmark of its own (step 4).
3. **Run the tests.** `npm test` checks the new place end to end: spacing,
   footprint, that it stands on land, its panel, its landmark's footprint,
   height and budgets, and the planet's totals. If it reports the modelling
   README's footprint table as stale, regenerate the table with
   `footprintTable` (`lib/world/kit.ts`) and paste it between the
   `footprints` markers in `components/world/models/README.md`.
4. **Optionally, a landmark of its own.** Build it from the kit following
   [`components/world/models/README.md`](components/world/models/README.md),
   register it in `components/world/models/registry.ts` under a new model key,
   add a `landmark.<key>.test.tsx` that calls `describeLandmark('<key>')`, and
   look at it at its place at 14:00, 18:00 and 23:00.

---

## Assets

- **Portrait:** `npm run process:portrait` regenerates the portrait from the
  source photo, which is git-ignored.
- **Résumé:** `public/Kylee-McCarthy-Resume.pdf` (linked from nav). Replace this file to update.
- **Project images:** under `public/media/<slug>/`, JPEG only, each under 250 KB
  through the image ladder.
- **The planet's fallback pictures:** `public/world/poster-{day,night}.webp`,
  retaken with `npm run capture:poster` whenever the landmarks change.

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
