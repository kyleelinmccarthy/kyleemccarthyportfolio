import { kickerClass } from '@/components/panels/parts'
import { employer, milestones } from '@/content/timeline'
import { newestFirst, roleDates } from '@/lib/profile'
import { ResumeButton, SectionTitle } from './parts'

/**
 * Experience: the company, how long she has been there, and every role she
 * has held in it, the one she holds now first, each with its dates and what
 * she did. Then the résumé.
 */
export function ProfileExperience() {
  return (
    <>
      <SectionTitle id="experience" />
      <div className="mb-4">
        <h2 className="m-0 font-display text-[19px] font-bold leading-[1.25] text-ink">{employer.name}</h2>
        <p className={`m-0 mt-1 ${kickerClass}`}>{`${employer.where} · ${employer.tenure}`}</p>
      </div>

      <ol className="m-0 grid list-none gap-[18px] p-0">
        {newestFirst(milestones).map((role, i) => (
          <li key={role.from} data-current={i === 0 && !role.to ? '' : undefined} className="profile-role">
            <p className={`m-0 ${kickerClass}`}>{roleDates(role)}</p>
            <h3 className="m-0 mt-0.5 font-display text-base font-bold leading-tight text-ink">{role.title}</h3>
            <ul className="m-0 mt-1.5 grid list-none gap-1.5 p-0">
              {role.points.map((point) => (
                <li key={point} className="profile-point">
                  {point}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>

      <div className="mt-5 border-t border-line pt-[13px]">
        <ResumeButton />
      </div>
    </>
  )
}
