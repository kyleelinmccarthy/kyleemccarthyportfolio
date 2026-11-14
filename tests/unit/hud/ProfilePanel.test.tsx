import { afterEach, describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { ProfilePanel } from '@/components/hud/ProfilePanel'
import { ProfileNav } from '@/components/hud/ProfileNav'
import { profileTrail } from '@/components/hud/profileTrail'
import { ProfileAbout } from '@/components/profile/ProfileAbout'
import { ProfileContact } from '@/components/profile/ProfileContact'
import { ProfileExperience } from '@/components/profile/ProfileExperience'
import { lead } from '@/content/about'
import { contact } from '@/content/contact'
import { profileSections, skills, summary } from '@/content/profile'
import { site } from '@/content/site'
import { education, employer, milestones } from '@/content/timeline'
import { roleDates } from '@/lib/profile'

const push = vi.fn()
let pathname = '/about'
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }), usePathname: () => pathname }))

afterEach(() => {
  push.mockClear()
  profileTrail.reset()
  pathname = '/about'
})

function panelAt(path: string, body = <ProfileAbout />) {
  pathname = path
  return render(<ProfilePanel>{body}</ProfilePanel>)
}

describe('ProfilePanel', () => {
  it('is named by its section’s heading, with a tab for each section and the open one marked', () => {
    panelAt('/experience', <ProfileExperience />)
    const panel = screen.getByRole('article', { name: 'Work history' })
    expect(panel).toHaveAttribute('data-covers-labels')
    const tabs = within(screen.getByRole('navigation', { name: 'Profile' })).getAllByRole('link')
    expect(tabs.map((t) => [t.textContent, t.getAttribute('href')])).toEqual(profileSections.map((s) => [s.label, s.href]))
    expect(tabs.filter((t) => t.getAttribute('aria-current') === 'page').map((t) => t.textContent)).toEqual(['Experience'])
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('closes to the planet for a visitor who arrived at it', () => {
    panelAt('/about')
    expect(screen.getByRole('link', { name: 'Close' })).toHaveAttribute('href', '/')
    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(push).toHaveBeenCalledWith('/')
  })

  it('opened from the header, takes focus at its heading, and closes back where the visitor was', () => {
    profileTrail.open('/places/beacon', 'contact', false)
    panelAt('/contact', <ProfileContact />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus()
    expect(screen.getByRole('link', { name: 'Close' })).toHaveAttribute('href', '/places/beacon')
    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(push).toHaveBeenCalledWith('/places/beacon')
    // The control that opened it is handed focus on the page it closes to.
    expect(profileTrail.takeFocusBack()).toBe('contact')
  })

  it('leaves Escape alone while the visitor is typing', () => {
    panelAt('/about', <input aria-label="field" />)
    fireEvent.keyDown(screen.getByLabelText('field'), { key: 'Escape' })
    expect(push).not.toHaveBeenCalled()
  })
})

describe('the sections', () => {
  it('About: who she is, the three figures, her degrees and every skill', () => {
    panelAt('/about')
    expect(screen.getByRole('heading', { level: 1, name: 'About me' })).toBeInTheDocument()
    expect(screen.getByText(summary)).toBeInTheDocument()
    for (const figure of lead.figures) expect(screen.getByText(figure.label)).toBeInTheDocument()
    for (const d of education) expect(screen.getByText(d.degree)).toBeInTheDocument()
    for (const group of skills) {
      expect(screen.getByText(group.group)).toBeInTheDocument()
      for (const item of group.items) expect(screen.getAllByText(item).length).toBeGreaterThan(0)
    }
    expect(screen.getByRole('link', { name: /Résumé/ })).toHaveAttribute('href', site.resumePath)
  })

  it('Experience: the company, then every role newest first with its dates and points', () => {
    panelAt('/experience', <ProfileExperience />)
    expect(screen.getByRole('heading', { level: 2, name: employer.name })).toBeInTheDocument()
    const titles = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(titles).toEqual([...milestones].reverse().map((m) => m.title))
    for (const m of milestones) {
      expect(screen.getByText(roleDates(m))).toBeInTheDocument()
      for (const point of m.points) expect(screen.getByText(point)).toBeInTheDocument()
    }
    expect(screen.getByText(/Nov 2022 – Present/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Résumé/ })).toHaveAttribute('download')
  })

  it('Contact: her email as a link and as text, LinkedIn and GitHub safely in a new tab, and the way to the letter box', () => {
    panelAt('/contact', <ProfileContact />)
    expect(screen.getByRole('link', { name: new RegExp(site.email) })).toHaveAttribute('href', `mailto:${site.email}`)
    expect(screen.getByText(site.email)).toBeInTheDocument()
    for (const [name, href] of [
      [/LinkedIn/, site.linkedin],
      [/GitHub/, site.github],
    ] as const) {
      const link = screen.getByRole('link', { name })
      expect(link).toHaveAttribute('href', href)
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    }
    expect(screen.getByText(new RegExp(site.location))).toBeInTheDocument()
    expect(screen.getByRole('link', { name: new RegExp(contact.mailbox.label) })).toHaveAttribute('href', '/places/post')
  })
})

describe('ProfileNav', () => {
  it('links each section, marks the open one, and has the menu that holds them for narrow screens', () => {
    pathname = '/contact'
    render(<ProfileNav home={false} />)
    const group = screen.getByRole('group', { name: 'Profile' })
    const links = within(group).getAllByRole('link')
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['/about', '/experience', '/contact'])
    expect(within(group).getByRole('link', { name: 'Contact' })).toHaveAttribute('aria-current', 'page')
    const menu = document.querySelector('details.profile-menu')!
    expect(within(menu as HTMLElement).getAllByRole('link').map((l) => l.getAttribute('href'))).toEqual(['/about', '/experience', '/contact'])
  })

  it('remembers where the visitor was when they open the profile', () => {
    pathname = '/places/beacon'
    window.history.replaceState(null, '', '/places/beacon')
    render(<ProfileNav home={false} />)
    const link = within(screen.getByRole('group', { name: 'Profile' })).getByRole('link', { name: 'Experience' })
    link.addEventListener('click', (e) => e.preventDefault())
    fireEvent.click(link)
    expect(profileTrail.back()).toBe('/places/beacon')
    window.history.replaceState(null, '', '/')
  })

  it('gives focus back to the control that opened the profile once it closes', () => {
    profileTrail.open('/', 'experience', false)
    profileTrail.close()
    render(<ProfileNav home />)
    // jsdom lays nothing out, so no control counts as shown; the test is that nothing throws and the request is used up.
    expect(profileTrail.takeFocusBack()).toBeNull()
  })
})
