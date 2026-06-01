import type { Metadata } from 'next'
import { SectionPage } from '@/components/SectionPage'
import { LeadScene } from '@/components/scenes'

export const metadata: Metadata = { title: 'How I Lead' }

export default function LeadershipPage() {
  return (
    <SectionPage title="How I lead">
      <LeadScene />
    </SectionPage>
  )
}
