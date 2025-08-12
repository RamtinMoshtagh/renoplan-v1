'use client'

import Link from 'next/link'
import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Menu, Hammer, Ruler, Upload, Search, FolderOpen,
  WalletCards, ShieldCheck, CheckCircle2, ArrowRight, FileDown, Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function LandingPageClient() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Decorative backgrounds */}
      <div
  aria-hidden
  className="pointer-events-none absolute inset-0 -z-10"
>
  <div className="absolute -left-40 top-[-10rem] h-[36rem] w-[36rem] rounded-full bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.2),transparent_60%)] blur-3xl" />
  <div className="absolute bottom-[-10rem] right-[-10rem] h-[36rem] w-[36rem] rounded-full bg-[radial-gradient(circle_at_center,hsl(var(--secondary)/0.2),transparent_60%)] blur-3xl" />
  <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/10 to-transparent dark:from-white/5" />
</div>


      <MarketingNav />
      <Hero />
      <Features />
      <HowItWorks />
      <PreviewSection />
      <Testimonials />
      <CTASection />
      <FAQ />
      <SiteFooter />
    </main>
  )
}

function MarketingNav() {
  const [open, setOpen] = useState(false)
  const nav = (
    <ul className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
      {[
        ['Features', '#features'],
        ['How it works', '#how-it-works'],
        ['Preview', '#preview'],
        ['FAQ', '#faq'],
      ].map(([label, href]) => (
        <li key={href}>
          <Link
            href={href}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => setOpen(false)}
          >
            {label}
          </Link>
        </li>
      ))}
    </ul>
  )
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 md:px-6">
        <Link href="/" className="group inline-flex items-center gap-2">
          <div className="relative h-5 w-5">
            <span className="absolute inset-0 rounded-lg bg-primary/80 shadow-[0_0_20px_2px_hsl(var(--primary)/0.4)]" />
          </div>
          <span className="text-base font-semibold tracking-tight">RenoPlan</span>
          <Badge variant="secondary" className="hidden rounded-md md:inline-flex">Early Access</Badge>
        </Link>
        <div className="ml-auto hidden md:block">{nav}</div>
        <div className="ml-2 hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Get started</Link>
          </Button>
        </div>
        <div className="ml-auto md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[360px]">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <span className="inline-flex h-4 w-4 rounded bg-primary/80" />
                  RenoPlan
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                {nav}
                <div className="flex items-center gap-2">
                  <Button asChild variant="ghost" className="flex-1" onClick={() => setOpen(false)}>
                    <Link href="/login">Sign in</Link>
                  </Button>
                  <Button asChild className="flex-1" onClick={() => setOpen(false)}>
                    <Link href="/register">Get started</Link>
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="relative mx-auto max-w-7xl px-4 pb-8 pt-12 md:px-6 md:pb-16 md:pt-20">
      <div className="grid items-center gap-10 md:grid-cols-2 md:gap-12">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Built with Next.js + Supabase
          </div>
          <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
            Renovation planning that actually <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">helps</span>
          </h1>
          <p className="mt-4 max-w-prose text-balance text-muted-foreground md:text-lg">
            RenoPlan keeps your project tidy from day one. Create rooms, upload photos & documents,
            track costs, and export a clean report for your contractor—or your future self.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <Link href="/register?next=/dashboard">Get started free</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login?next=/dashboard">Sign in</Link>
            </Button>
          </div>
          <ul className="mt-6 grid max-w-xl grid-cols-1 gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            {[
              ['Unlimited rooms per project', <Ruler key="r" className="h-4 w-4" />],
              ['Fast uploads to secure storage', <Upload key="u" className="h-4 w-4" />],
              ['Smart search across rooms', <Search key="s" className="h-4 w-4" />],
              ['CSV export & print-ready report', <FileDown key="f" className="h-4 w-4" />],
            ].map(([label, icon]) => (
              <li key={label as string} className="inline-flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border">{icon}</span>
                {label}
              </li>
            ))}
          </ul>
        </div>
        <FeaturePreview />
      </div>
    </section>
  )
}

function FeaturePreview() {
  const rooms = ['Kitchen', 'Living room', 'Bathroom', 'Bedroom', 'Hallway'] as const
  const roomCounts: Record<(typeof rooms)[number], number> = {
    Kitchen: 8,
    'Living room': 6,
    Bathroom: 5,
    Bedroom: 7,
    Hallway: 9,
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="relative"
    >
      {/* ... */}
      <Card className="overflow-hidden rounded-2xl shadow-xl">
        <CardContent className="p-0">
          <div className="grid grid-cols-12">
            <aside className="col-span-4 hidden border-r bg-muted/40 p-4 md:block">
              <div className="mb-3 text-xs font-medium text-muted-foreground">Rooms</div>
              <ul className="space-y-1 text-sm">
                {rooms.map((r, i) => (
                  <li
                    key={r}
                    className={`flex items-center justify-between rounded-lg px-2 py-1.5 ${
                      i === 0 ? 'bg-background shadow-sm' : 'hover:bg-background/70'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <FolderOpen className="h-4 w-4" /> {r}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {roomCounts[r]} files
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 h-px bg-border" />
              <div className="mt-4 text-xs text-muted-foreground">Search uploads…</div>
              <div className="mt-2 flex items-center gap-2 rounded-lg border bg-background px-2 py-1.5 text-sm text-muted-foreground">
                <Search className="h-4 w-4" /> kitchen tiles
              </div>
            </aside>
            <div className="col-span-12 p-4 md:col-span-8">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Project</div>
                  <div className="text-lg font-semibold">Apartment refresh</div>
                </div>
                <Button size="sm" variant="outline" className="gap-1">
                  <Upload className="h-4 w-4" /> Upload
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="group relative aspect-video overflow-hidden rounded-xl border bg-muted/30">
<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.4),transparent_60%)] opacity-0 transition-opacity group-hover:opacity-100" />                    <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-background/80 px-1.5 py-0.5 text-[10px] backdrop-blur">
                      Kitchen
                    </div>
                    <div className="absolute bottom-2 left-2 text-xs">tile_0{i + 1}.jpg</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl border bg-background p-3">
                <div className="mb-1 text-sm font-medium">Budget snapshot</div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  {[
                    ['Items', '23'],
                    ['Spent', 'kr 48 300'],
                    ['Saved', 'kr 5 200'],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-lg bg-muted/30 p-2">
                      <div className="text-xs text-muted-foreground">{k}</div>
                      <div className="font-medium">{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function Features() {
  const items = [
    { title: 'Room-first organization', icon: <Ruler className="h-5 w-5" />, desc: 'Create rooms once and keep every photo, doc, and note neatly grouped.' },
    { title: 'Fast, secure uploads', icon: <Upload className="h-5 w-5" />, desc: 'Store files safely with Supabase Storage and access them anywhere.' },
    { title: 'Smart search', icon: <Search className="h-5 w-5" />, desc: 'Find any upload instantly by room name, file name, or notes.' },
    { title: 'Budget tracking', icon: <WalletCards className="h-5 w-5" />, desc: 'Add items, apply membership discounts, and see a running total.' },
    { title: 'Share & export', icon: <FileDown className="h-5 w-5" />, desc: 'Export CSV and print-ready reports for contractors and insurance.' },
    { title: 'Privacy by design', icon: <ShieldCheck className="h-5 w-5" />, desc: 'Granular RLS policies and secure auth with Supabase.' },
  ]
  return (
    <section id="features" className="mx-auto max-w-7xl px-4 py-16 md:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-pretty text-3xl font-semibold tracking-tight md:text-4xl">
          Everything your renovation needs—nothing it doesn’t
        </h2>
        <p className="mt-3 text-muted-foreground md:text-lg">
          RenoPlan is built to stay simple as your project grows complex.
        </p>
      </div>
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((f) => (
          <Card key={f.title} className="rounded-2xl">
            <CardContent className="p-5">
              <div className="mb-3 inline-flex rounded-xl border bg-background p-2">{f.icon}</div>
              <div className="text-base font-semibold">{f.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    { title: 'Create your project & rooms', desc: 'Name your project and add the rooms you plan to work on.', icon: <Hammer className="h-5 w-5" /> },
    { title: 'Upload photos & documents', desc: 'Keep quotes, receipts, and inspiration in one tidy place.', icon: <Upload className="h-5 w-5" /> },
    { title: 'Track costs & export', desc: 'Stay on budget and share a clean report when you’re ready.', icon: <CheckCircle2 className="h-5 w-5" /> },
  ]
  return (
    <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-16 md:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">How it works</h2>
        <p className="mt-3 text-muted-foreground md:text-lg">Start in minutes. Keep the momentum for months.</p>
      </div>
      <ol className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title} className="relative">
            <Card className="h-full rounded-2xl">
              <CardContent className="flex h-full flex-col gap-2 p-5">
                <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border font-semibold">{i + 1}</span>
                  {s.icon}
                </div>
                <div className="text-base font-semibold">{s.title}</div>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </CardContent>
            </Card>
          </li>
        ))}
      </ol>
    </section>
  )
}

function PreviewSection() {
  return (
    <section id="preview" className="mx-auto max-w-7xl px-4 py-16 md:px-6">
      <div className="grid items-center gap-8 md:grid-cols-2">
        <div>
          <h2 className="text-pretty text-3xl font-semibold tracking-tight md:text-4xl">A tidy home for every messy detail</h2>
          <p className="mt-3 text-muted-foreground md:text-lg">
            Rooms, uploads, notes, budget—kept together and easy to search.
            No more endless camera roll scrolling or lost PDFs.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button asChild>
              <Link href="/register?next=/dashboard">Create your first project</Link>
            </Button>
            <Button asChild variant="ghost" className="gap-2">
              <Link href="#features">See features <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
        <FeaturePreview />
      </div>
    </section>
  )
}

function Testimonials() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
      <Card className="rounded-2xl">
        <CardContent className="p-6 md:p-8">
          <figure className="mx-auto max-w-3xl text-center">
            <blockquote className="text-balance text-lg italic text-muted-foreground">
              “RenoPlan saved us weeks of back-and-forth. Our contractor had everything in one place—photos, materials, and a clear budget.”
            </blockquote>
            <figcaption className="mt-3 text-sm font-medium">— Early access homeowner</figcaption>
          </figure>
        </CardContent>
      </Card>
    </section>
  )
}

function CTASection() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-16 md:px-6">
      <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/15 via-background to-secondary/15 p-6 md:p-10">
        <div className="max-w-2xl">
          <h3 className="text-pretty text-2xl font-semibold tracking-tight md:text-3xl">Ready to make renovation simple?</h3>
          <p className="mt-2 text-muted-foreground">Join the early access—free while we build. Your feedback shapes the roadmap.</p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <Link href="/register?next=/dashboard">Get started free</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login?next=/dashboard">Sign in</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

function FAQ() {
  const items = [
    ['Is RenoPlan free?', 'During early access, yes. We’ll introduce affordable plans once the core is solid.'],
    ['Can I invite others?', 'You can share exported reports and CSVs today. Multi-user projects are on the roadmap.'],
    ['Where are my files stored?', 'Uploads are stored securely using Supabase Storage with RLS policies in place.'],
    ['Can I export my data?', 'Absolutely. Export CSV for budget items and a print-ready project report anytime.'],
  ] as const
  return (
    <section id="faq" className="mx-auto max-w-7xl px-4 py-16 md:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">FAQ</h2>
        <p className="mt-3 text-muted-foreground md:text-lg">Quick answers to common questions.</p>
      </div>
      <div className="mx-auto mt-8 max-w-3xl divide-y rounded-2xl border">
        {items.map(([q, a]) => (
          <details key={q} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left text-base font-medium">
              <span>{q}</span>
              <ArrowRight className="h-4 w-4 transition-transform group-open:rotate-90" />
            </summary>
            <div className="px-5 pb-5 text-sm text-muted-foreground">{a}</div>
          </details>
        ))}
      </div>
    </section>
  )
}

function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground md:flex-row md:px-6">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-4 w-4 rounded bg-primary/80" />
          <span>RenoPlan</span>
          <span>·</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
        <nav aria-label="Footer">
          <ul className="flex items-center gap-4">
            <li><Link href="#features" className="hover:text-foreground">Features</Link></li>
            <li><Link href="#faq" className="hover:text-foreground">FAQ</Link></li>
            <li><Link href="/login?next=/dashboard" className="hover:text-foreground">Sign in</Link></li>
          </ul>
        </nav>
      </div>
    </footer>
  )
}
