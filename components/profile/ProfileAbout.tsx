import { Education, Figures, Lead, Prose } from '@/components/panels/parts'
import { hero, lead } from '@/content/about'
import { profileCopy, skills, summary } from '@/content/profile'
import { site } from '@/content/site'
import { education } from '@/content/timeline'
import { Block, ResumeButton, SectionTitle } from './parts'

/**
 * About: who she is (the headline and the résumé's summary), the three proof
 * figures, her degrees and her skills as the résumé groups them, each skill a
 * chip so the eye can run down them.
 */
export function ProfileAbout() {
  return (
    <>
      <SectionTitle id="about" kicker={`${site.jobTitle} · ${site.location}`} />
      <Lead>{hero.headline}</Lead>
      <Prose>{summary}</Prose>
      <Prose>{hero.why}</Prose>

      <Block heading={profileCopy.figures}>
        <Figures figures={lead.figures} />
      </Block>

      <Block heading={profileCopy.education}>
        <Education degrees={education} />
      </Block>

      <Block heading={profileCopy.skills}>
        <dl className="m-0 grid gap-3.5">
          {skills.map((group) => (
            <div key={group.group}>
              <dt className="mb-1.5 font-display text-[14.5px] font-bold text-ink">{group.group}</dt>
              <dd className="m-0">
                <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
                  {group.items.map((item) => (
                    <li key={item} className="profile-chip">
                      {item}
                    </li>
                  ))}
                </ul>
                {group.note ? <p className="m-0 mt-1.5 text-[13px] leading-snug text-muted">{group.note}</p> : null}
              </dd>
            </div>
          ))}
        </dl>
      </Block>

      <div className="mt-5 border-t border-line pt-[13px]">
        <ResumeButton />
      </div>
    </>
  )
}
