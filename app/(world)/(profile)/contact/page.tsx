import { ProfileContact } from '@/components/profile/ProfileContact'
import { profileMetadata } from '@/lib/profileMetadata'

export const metadata = profileMetadata('contact')

export default function ContactPage() {
  return <ProfileContact />
}
