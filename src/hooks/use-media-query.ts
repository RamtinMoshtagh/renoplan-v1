// hooks/use-media-query.ts
'use client'
import * as React from 'react'

export function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState(false)

  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const m = window.matchMedia(query)
    const handler = () => setMatches(m.matches)

    // run once
    handler()

    // Safari < 14 fallback
    if (typeof m.addEventListener === 'function') {
      m.addEventListener('change', handler)
      return () => m.removeEventListener('change', handler)
    } else {
      // @ts-ignore legacy API
      m.addListener(handler)
      // @ts-ignore legacy API
      return () => m.removeListener(handler)
    }
  }, [query])

  return matches
}
