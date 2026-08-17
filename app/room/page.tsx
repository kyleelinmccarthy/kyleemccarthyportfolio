import type { Metadata } from 'next'
import { SectionPage } from '@/components/SectionPage'
import { RoomSections } from '@/components/room/RoomSections'
import { Backdrop } from '@/components/media/Backdrop'

export const metadata: Metadata = {
  title: 'The Other Room',
  description: 'The personal side — things I build after hours, things I draw, and what I do off the clock.',
}

export default function RoomPage() {
  return (
    <SectionPage title="My personal library">
      {/* The one room that isn't on the home journey still gets its own place.
          Fixed, not absolute: this page is several screens long. */}
      <Backdrop variant="library" anchor="fixed" />
      <div className="relative z-10">
        <RoomSections />
      </div>
    </SectionPage>
  )
}
