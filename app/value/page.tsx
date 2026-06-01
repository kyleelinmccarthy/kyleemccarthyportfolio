import type { Metadata } from 'next'
import { SectionPage } from '@/components/SectionPage'
import { ValueScene } from '@/components/scenes'

export const metadata: Metadata = { title: 'How I Create Value' }

export default function ValuePage() {
  return (
    <SectionPage title="How I create value">
      <ValueScene />
    </SectionPage>
  )
}
