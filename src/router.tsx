// Tiny history router. Five screens, no dependency needed.

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

const RouteCtx = createContext('/')

export function RouterProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(window.location.pathname)
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  useEffect(() => {
    const onNav = (e: Event) => setPath((e as CustomEvent<string>).detail)
    window.addEventListener('demo:nav', onNav)
    return () => window.removeEventListener('demo:nav', onNav)
  }, [])
  return <RouteCtx.Provider value={path}>{children}</RouteCtx.Provider>
}

export function useRoute() {
  return useContext(RouteCtx)
}

export function navigate(to: string) {
  if (window.location.pathname === to) return
  window.history.pushState(null, '', to + window.location.search)
  window.dispatchEvent(new CustomEvent('demo:nav', { detail: to }))
  window.scrollTo(0, 0)
}

export function Link({
  to,
  children,
  className,
  ariaCurrent,
  onNavigate,
}: {
  to: string
  children: ReactNode
  className?: string
  ariaCurrent?: boolean
  onNavigate?: () => void
}) {
  return (
    <a
      href={to}
      className={className}
      aria-current={ariaCurrent ? 'page' : undefined}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        navigate(to)
        onNavigate?.()
      }}
    >
      {children}
    </a>
  )
}
