import { ProfileAbout } from '@/components/profile/ProfileAbout'
import { profileMetadata } from '@/lib/profileMetadata'

export const metadata = profileMetadata('about')

export default function AboutPage() {
  return <ProfileAbout />
}
