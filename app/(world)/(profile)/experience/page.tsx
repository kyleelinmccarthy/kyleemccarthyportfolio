import { ProfileExperience } from '@/components/profile/ProfileExperience'
import { profileMetadata } from '@/lib/profileMetadata'

export const metadata = profileMetadata('experience')

export default function ExperiencePage() {
  return <ProfileExperience />
}
