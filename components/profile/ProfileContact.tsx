import Link from 'next/link'
import { kickerClass, Lead } from '@/components/panels/parts'
import { contact } from '@/content/contact'
import { profileCopy } from '@/content/profile'
import { site } from '@/content/site'
import { contactLinks, EXTERNAL_LINK } from '@/lib/profile'
import { placeHref } from '@/lib/world/route'
import { SectionTitle } from './parts'

/** The place on the planet where the letter box stands, with its form. */
const LETTERBOX = 'post'

/**
 * Contact: where she is, every way to reach her (each a whole row to press,
 * its address shown as text too, another site in a new tab with no referrer),
 * and the way to the letter box's form, which stays where it is.
 */
export function ProfileContact() {
  return (
    <>
      <SectionTitle id="contact" kicker={`${profileCopy.contact.location} ${site.location}`} />
      <ul className="m-0 mb-5 mt-4 list-none border-t border-line p-0">
        {contactLinks(site).map((link) => (
          <li key={link.id}>
            <a
              href={link.href}
              {...(link.external ? EXTERNAL_LINK : {})}
              {...(link.download ? { download: true } : {})}
              className="profile-contact"
            >
              <span className={kickerClass}>{link.label}</span>
              <span className="profile-contact-value">
                {link.text}
                {link.download ? <span className="text-muted">{` · ${profileCopy.contact.resumeNote}`}</span> : null}
              </span>
              {link.external ? <span className="sr-only">{` (${profileCopy.contact.newTab})`}</span> : null}
              <span aria-hidden className="profile-contact-arrow">
                {link.external ? '↗' : link.download ? '↓' : '→'}
              </span>
            </a>
          </li>
        ))}
      </ul>

      <div className="border border-line p-4">
        <Lead>{contact.mailbox.hint}</Lead>
        <Link href={placeHref(LETTERBOX)} className="glass hud-btn hud-btn-primary">
          {contact.mailbox.label} <span aria-hidden>→</span>
        </Link>
      </div>
    </>
  )
}
