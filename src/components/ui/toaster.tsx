'use client'

import { Toaster as SonnerToaster } from 'sonner'
import { useTheme } from 'next-themes'

export function Toaster() {
  const { theme } = useTheme()

  return (
    <SonnerToaster
      position="top-right"
      closeButton
      richColors
      theme={theme === 'dark' ? 'dark' : 'light'}
      toastOptions={{
        classNames: {
          toast:
            'rounded-lg border border-neutral-200 bg-white shadow-md dark:border-neutral-800 dark:bg-neutral-900',
          title: 'text-sm font-medium',
          description: 'text-xs opacity-80',
          actionButton:
            'rounded-md border border-neutral-300 bg-neutral-50 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-800',
          cancelButton:
            'rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700',
        },
      }}
    />
  )
}
