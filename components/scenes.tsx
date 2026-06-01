'use client'

import { NameLogo } from '@/components/primitives/NameLogo'
import { CTA } from '@/components/primitives/CTA'
import { CountUp } from '@/components/primitives/CountUp'
import { Portrait } from '@/components/media/Portrait'
import { GrowthBars } from '@/components/sections/GrowthBars'
import { RevealOnActive, useSceneActive } from '@/components/journey/sceneActive'
import { hero } from '@/content/hero'
import { journey } from '@/content/journey'
import { projects } from '@/content/projects'
import { site } from '@/content/site'

const FLAGSHIP_SLUGS = ['403hq', 'tech-hub', 'aura', 'nbs-marketing']

function Eyebrow({ children }: { children: string }) {
  return <p className="font-sans text-label uppercase text-accent">{children}</p>
}

function Figure({ value, label, index = 0 }: { value: string; label: string; index?: number }) {
  const active = useSceneActive()
  return (
    <RevealOnActive index={index}>
      <span className="block whitespace-nowrap font-serif text-fluid-stat leading-none text-accent">
        <CountUp value={value} active={active ?? undefined} />
      </span>
      <span className="mt-2 block max-w-[14rem] font-sans text-sm leading-snug text-fg-muted">
        {label}
      </span>
    </RevealOnActive>
  )
}

export function AboutScene() {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)] lg:gap-14">
      <Portrait className="max-w-[240px] lg:max-w-none" />
      <div>
        <p className="mb-2 font-sans text-label uppercase text-accent">{journey.about.eyebrow}</p>
        <NameLogo size="hero" animate />
        <RevealOnActive index={1}>
          <h1 className="mt-6 max-w-3xl font-serif text-[clamp(1.9rem,3.4vw,3.25rem)] leading-[1.12] text-fg">
            {hero.headline}
          </h1>
        </RevealOnActive>
        <RevealOnActive index={2}>
          <p className="mt-5 max-w-xl font-sans text-lg leading-relaxed text-fg">{hero.why}</p>
        </RevealOnActive>
        <RevealOnActive index={3}>
          <p className="mt-4 max-w-xl font-sans leading-relaxed text-fg-muted">{journey.about.lede}</p>
        </RevealOnActive>
      </div>
    </div>
  )
}

export function LeadScene() {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
      <div>
        <RevealOnActive>
          <Eyebrow>{journey.lead.eyebrow}</Eyebrow>
          <h2 className="mt-4 max-w-xl font-serif text-fluid-h2 text-fg">{journey.lead.statement}</h2>
        </RevealOnActive>
        <RevealOnActive index={1}>
          <p className="mt-5 max-w-xl font-sans leading-relaxed text-fg-muted">{journey.lead.context}</p>
        </RevealOnActive>
        <div className="mt-8 grid grid-cols-3 gap-6">
          {journey.lead.figures.map((f, i) => (
            <Figure key={f.label} value={f.value} label={f.label} index={i + 2} />
          ))}
        </div>
      </div>
      <GrowthBars />
    </div>
  )
}

export function ValueScene() {
  return (
    <div>
      <RevealOnActive>
        <Eyebrow>{journey.value.eyebrow}</Eyebrow>
        <h2 className="mt-4 max-w-2xl font-serif text-fluid-h2 text-fg">{journey.value.statement}</h2>
      </RevealOnActive>
      <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2">
        {journey.value.items.map((it, i) => (
          <RevealOnActive key={it.number} index={i + 1} className="border-l-2 border-terracotta-500 pl-5">
            <p className="font-serif text-xl text-accent">{it.number}</p>
            <h3 className="mt-1 font-serif text-2xl leading-tight text-fg">{it.title}</h3>
            <p className="mt-2 font-sans text-fg-muted">{it.tag}</p>
          </RevealOnActive>
        ))}
      </div>
    </div>
  )
}

export function BuildScene() {
  const flagships = FLAGSHIP_SLUGS.map((s) => projects.find((p) => p.slug === s)).filter(
    (p): p is NonNullable<typeof p> => Boolean(p)
  )
  return (
    <div>
      <RevealOnActive>
        <Eyebrow>{journey.build.eyebrow}</Eyebrow>
        <h2 className="mt-4 max-w-2xl font-serif text-fluid-h2 text-fg">{journey.build.statement}</h2>
      </RevealOnActive>
      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
        <div className="grid grid-cols-3 gap-6">
          {journey.build.figures.map((f, i) => (
            <Figure key={f.label} value={f.value} label={f.label} index={i + 1} />
          ))}
        </div>
        <RevealOnActive index={4}>
          <p className="font-sans text-sm leading-relaxed text-fg-muted">{journey.build.context}</p>
        </RevealOnActive>
      </div>
      <RevealOnActive index={5}>
        <ul className="mt-10 flex flex-wrap gap-3">
          {flagships.map((p) => (
            <li key={p.slug}>
              <a
                href={p.liveUrl ?? '#contact'}
                target={p.liveUrl ? '_blank' : undefined}
                rel={p.liveUrl ? 'noopener noreferrer' : undefined}
                className="inline-flex items-center gap-2 rounded-full bg-surface-raised px-4 py-2 font-sans text-sm font-medium text-fg ring-1 ring-rule transition-colors hover:text-accent hover:ring-accent"
              >
                {p.name}
                {p.liveUrl && (
                  <span aria-hidden="true" className="text-accent">
                    ↗
                  </span>
                )}
              </a>
            </li>
          ))}
        </ul>
      </RevealOnActive>
    </div>
  )
}

export function TalkScene() {
  return (
    <div className="max-w-2xl">
      <RevealOnActive>
        <h2 className="font-serif text-fluid-hero text-fg">{journey.talk.heading}</h2>
      </RevealOnActive>
      <RevealOnActive index={1}>
        <p className="mt-6 font-sans text-xl leading-relaxed text-fg-muted">{journey.talk.body}</p>
      </RevealOnActive>
      <RevealOnActive index={2}>
        <div className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <CTA href="#contact" variant="primary" arrow="down">
            Send a note
          </CTA>
          <a
            href={`mailto:${site.email}`}
            className="font-sans font-semibold text-accent underline-offset-4 hover:underline"
          >
            or email me directly
          </a>
        </div>
      </RevealOnActive>
    </div>
  )
}
