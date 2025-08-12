import type { Metadata } from 'next'
import LandingPageClient from '@/components/marketing/LandingPageClient'

export const metadata: Metadata = {
  title: 'RenoPlan — Renovation planning that actually helps',
  description:
    'RenoPlan is a modern renovation planner for homeowners, designers, and contractors. Organize rooms, upload docs & photos, track costs, and export clean reports.',
  openGraph: {
    title: 'RenoPlan — Renovation planning that actually helps',
    description:
      'Organize rooms, upload docs & photos, track costs, and export clean reports.',
    url: 'https://renoplan.app',
    siteName: 'RenoPlan',
    images: [{ url: '/og-renoplan.jpg', width: 1200, height: 630, alt: 'RenoPlan preview' }],
    locale: 'en_US',
    type: 'website',
  },
}

export default function Page() {
  return <LandingPageClient />
}
