import { Header } from '@/components/hud/Header'
import { IndexDrawerProvider } from '@/components/hud/IndexDrawer'
import { IndexList } from '@/components/hud/IndexList'
import { Legend } from '@/components/hud/Legend'
import { places, tourDistricts, tourOrder } from '@/content/world'

export default function HomePage() {
  return (
    <IndexDrawerProvider>
      <Header home />
      <main id="main">
        {/*
          Districts link to their island once the canvas exists; without JavaScript there is no island to turn to.
          It gives way to the planet when the camera comes in close (see globals.css). On the narrowest phones the
          controls under it wrap onto two rows, so it stands higher. On a phone it is held 26px in from both sides, so
          its plate (which reaches 14px past it) stays inside the frame.
        */}
        <div
          data-covers-labels
          data-gives-way
          className="fixed bottom-9 left-10 z-[5] max-[820px]:bottom-[84px] max-[820px]:left-[26px] max-[820px]:right-[26px] max-[380px]:bottom-[124px] [html:not([data-js])_&]:hidden"
        >
          <Legend districts={tourDistricts} />
        </div>
        <IndexList districts={tourDistricts} places={places} tourOrder={tourOrder} />
      </main>
    </IndexDrawerProvider>
  )
}
