import type { ReactNode } from 'react'
import { PANEL_TITLE, PROFILE_TITLE_ID } from '@/components/hud/panelStyles'
import { kickerClass } from '@/components/panels/parts'
import { resumeLabel } from '@/content/about'
import type { ProfileSectionId } from '@/content/profile'
import { site } from '@/content/site'
import { profileSection } from '@/lib/profile'

/**
 * The section's heading, the page's h1 and the panel's name, with its kicker
 * above it. It takes focus when the panel opens from the header (`tabIndex`).
 */
export function SectionTitle({ id, kicker }: { id: ProfileSectionId; kicker?: string }) {
  return (
    <>
      {kicker ? <p className={`m-0 mb-1.5 ${kickerClass}`}>{kicker}</p> : null}
      <h1 id={PROFILE_TITLE_ID} tabIndex={-1} className={PANEL_TITLE}>
        {profileSection(id).title}
      </h1>
    </>
  )
}

/** A part of a section, under a small mono heading and a hairline. */
export function Block({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="mt-[18px] border-t border-line pt-3.5">
      <h2 className={`m-0 mb-2.5 ${kickerClass}`}>{heading}</h2>
      {children}
    </section>
  )
}

/** The résumé, to save: the inked button every section ends on. */
export function ResumeButton() {
  return (
    <a href={site.resumePath} download className="glass hud-btn hud-btn-primary">
      {resumeLabel} <span aria-hidden>↓</span>
    </a>
  )
}
