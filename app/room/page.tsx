import type { Metadata } from 'next'
import { SectionPage } from '@/components/SectionPage'
import { RoomSections } from '@/components/room/RoomSections'

export const metadata: Metadata = {
  title: 'The Other Room',
  description: 'The personal side — things I build after hours, things I draw, and what I do off the clock.',
}

export default function RoomPage() {
  return (
    <SectionPage title="The other room">
      <RoomSections />
    </SectionPage>
  )
}
