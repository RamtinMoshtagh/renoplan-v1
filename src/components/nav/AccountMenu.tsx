'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { supabaseBrowser } from '@/lib/supabase/client'

export default function AccountMenu({ email: initialEmail }: { email?: string }) {
  const [email, setEmail] = useState(initialEmail ?? '')

  useEffect(() => {
    if (initialEmail) return
    const supa = supabaseBrowser()
    supa.auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email)
    })
  }, [initialEmail])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          {email || 'Account'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href="/logout?next=/marketing" className="w-full">
            Sign out
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
