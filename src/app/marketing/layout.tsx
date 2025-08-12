import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: 'RenoPlan — %s',
    default: 'RenoPlan',
  },
  description:
    'RenoPlan makes renovation planning simple: organize rooms, upload docs & photos, track costs, and export clean reports.',
  openGraph: {
    title: 'RenoPlan',
    description:
      'Organize rooms, upload docs & photos, track costs, and export clean reports.',
    url: 'https://renoplan.app',
    siteName: 'RenoPlan',
    images: [{ url: '/og-renoplan.jpg', width: 1200, height: 630, alt: 'RenoPlan preview' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RenoPlan',
    description:
      'Organize rooms, upload docs & photos, track costs, and export clean reports.',
    images: ['/og-renoplan.jpg'],
  },
  robots: { index: true, follow: true },
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      {children}
    </div>
  )
}
