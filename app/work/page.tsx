import type { Metadata } from 'next'
import { SectionPage } from '@/components/SectionPage'
import { ProjectDetails } from '@/components/ProjectDetails'

export const metadata: Metadata = { title: 'What I Build' }

export default function WorkPage() {
  return (
    <SectionPage title="What I build">
      <ProjectDetails />
    </SectionPage>
  )
}
