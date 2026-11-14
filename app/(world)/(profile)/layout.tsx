import { Header } from '@/components/hud/Header'
import { ProfilePanel } from '@/components/hud/ProfilePanel'

/**
 * The profile's pages, /about, /experience and /contact: the planet behind,
 * the header, and the profile's panel over it with the section the address
 * names. The panel is the layout's, so it stays put while the visitor moves
 * between the three.
 */
export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header home={false} />
      <main id="main">
        <ProfilePanel>{children}</ProfilePanel>
      </main>
    </>
  )
}
