import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { PlacePanelBody } from '@/components/panels/registry'
import { ProjectPanel } from '@/components/panels/ProjectPanel'
import { caseStudies } from '@/content/caseStudies'
import { projects } from '@/content/projects'
import type { Project } from '@/content/types'
import { placeById } from '@/content/world'

const panel = (id: string) => render(<PlacePanelBody place={placeById(id)!} />)
const project = (slug: string) => projects.find((p) => p.slug === slug)!

describe('project panel', () => {
  it('shows the headline, hero, status and chips, and no link when there is no live site', () => {
    const eliminated = project('eliminated')
    panel('eliminated')
    expect(screen.getByText('A wholesome party game where everyone dies.')).toBeInTheDocument()
    expect(screen.getByText(eliminated.descriptor)).toBeInTheDocument()
    const hero = screen.getAllByRole('img')[0]!
    expect(hero.getAttribute('alt')).toBe(eliminated.media!.hero.alt)
    expect(hero.getAttribute('alt')).not.toBe('')
    expect(screen.getByText('Coming soon to Steam')).toBeInTheDocument()
    expect(screen.getByText('Unity 6')).toBeInTheDocument()
    expect(screen.getByText('C#')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Visit/ })).toBeNull()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('does not render a second h1: the shell owns the place name', () => {
    panel('eliminated')
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull()
  })

  it('labels the live link "Try the demo" for The Budget and opens it safely in a new tab', () => {
    panel('the-budget')
    const link = screen.getByRole('link', { name: 'Try the demo' })
    expect(link).toHaveAttribute('href', project('the-budget').liveUrl)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('labels the live link "Visit" for any other project with a site', () => {
    panel('403hq')
    const link = screen.getByRole('link', { name: 'Visit' })
    expect(link).toHaveAttribute('href', project('403hq').liveUrl)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('shows the placard of a project that has one, with the old placard wording', () => {
    panel('beacon')
    const placard = caseStudies.find((c) => c.slug === 'beacon')!.placard!
    expect(screen.getByText('The hard part')).toBeInTheDocument()
    expect(screen.getByText(placard.hard)).toBeInTheDocument()
    expect(screen.getByText('Thrown away')).toBeInTheDocument()
    expect(screen.getByText(placard.threwAway)).toBeInTheDocument()
    expect(screen.getByText('Next time')).toBeInTheDocument()
    expect(screen.getByText(placard.differently)).toBeInTheDocument()
    expect(screen.getByText('Built for')).toBeInTheDocument()
    expect(screen.getByText(placard.builtFor)).toBeInTheDocument()
  })

  it('shows the problem block only when the project has a problem', () => {
    const { unmount } = panel('eliminated')
    expect(screen.getByText('Problem')).toBeInTheDocument()
    expect(screen.getByText(project('eliminated').problem!)).toBeInTheDocument()
    unmount()

    const { container } = panel('jimothy-and-pidge')
    expect(screen.queryByText('Problem')).toBeNull()
    // No label left standing over nothing: every term has a definition with text.
    for (const term of container.querySelectorAll('dt')) {
      expect(term.nextElementSibling?.textContent?.trim(), term.textContent ?? '').toBeTruthy()
    }
  })

  it('shows no placard for a project without a case study', () => {
    const { container } = panel('jimothy-and-pidge')
    expect(screen.queryByText('The hard part')).toBeNull()
    expect(container.querySelector('details')).toBeNull()
  })

  it('shows the gallery thumbnails when the project has more images', () => {
    const { container } = panel('eliminated')
    const gallery = project('eliminated').media!.gallery!
    expect(container.querySelectorAll('li img')).toHaveLength(gallery.length)
    expect(screen.getAllByRole('button', { name: gallery[0]!.alt }).length).toBeGreaterThan(0)
  })

  it('renders a project with nothing optional cleanly', () => {
    const bare: Project = {
      slug: 'bare',
      name: 'Bare',
      descriptor: 'Nothing optional',
      headline: 'A headline.',
      built: 'It was built.',
      status: 'concept',
      isPersonal: false,
    }
    const { container } = render(<ProjectPanel project={bare} />)
    expect(screen.getByText('It was built.')).toBeInTheDocument()
    expect(screen.getByText('A headline.')).toBeInTheDocument()
    expect(screen.getByText('Concept')).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
    expect(screen.queryAllByRole('list')).toHaveLength(0)
    expect(container.querySelector('ul, ol, details')).toBeNull()
    expect(screen.queryAllByRole('link')).toHaveLength(0)
    expect(screen.queryByText('Problem')).toBeNull()
    expect(screen.queryByText('Outcome')).toBeNull()
    expect(within(container).queryByRole('button')).toBeNull()
  })
})
