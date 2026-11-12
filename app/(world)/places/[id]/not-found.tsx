import Link from 'next/link'
import { Header } from '@/components/hud/Header'

export default function PlaceNotFound() {
  return (
    <>
      <Header home={false} />
      <main
        id="main"
        className="glass fixed right-10 top-[98px] z-[8] w-[400px] px-[22px] py-5 max-[820px]:bottom-3.5 max-[820px]:left-3.5 max-[820px]:right-3.5 max-[820px]:top-auto max-[820px]:w-auto"
      >
        <h1 className="mb-[9px] font-display text-[32px] font-extrabold leading-[1.03] tracking-[-0.015em]">
          Nowhere on this planet
        </h1>
        <p className="mb-4 text-[14.5px] leading-[1.62] text-muted">There is no place at that address.</p>
        <Link href="/" className="hud-btn hud-btn-primary glass">
          Back to the planet
        </Link>
      </main>
    </>
  )
}
