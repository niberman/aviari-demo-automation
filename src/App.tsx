import { lazy, Suspense, useEffect, useState } from 'react'
import { ToastStack } from './components'
import { useDemo } from './demo/store'
import {
  BoxIcon,
  CalendarIcon,
  InboxIcon,
  Spark,
  Sunrise,
} from './icons'
import { Link, useRoute } from './router'
import Brief from './screens/Brief'

const Inbox = lazy(() => import('./screens/Inbox'))
const Schedule = lazy(() => import('./screens/Schedule'))
const Orders = lazy(() => import('./screens/Orders'))
const Automations = lazy(() => import('./screens/Automations'))

const SCREENS = [
  { path: '/', label: 'Morning brief', short: 'Brief', icon: Sunrise, title: 'Morning brief' },
  { path: '/inbox', label: 'Inbox triage', short: 'Inbox', icon: InboxIcon, title: 'Inbox triage' },
  { path: '/schedule', label: 'Scheduling', short: 'Schedule', icon: CalendarIcon, title: 'Scheduling' },
  { path: '/orders', label: 'Vendor orders', short: 'Orders', icon: BoxIcon, title: 'Vendor orders' },
  { path: '/automations', label: 'Automations', short: 'Rules', icon: Spark, title: 'Automations' },
]

export default function App() {
  const s = useDemo()
  const path = useRoute()
  const active = SCREENS.find((x) => x.path === path) ?? SCREENS[0]
  const [settled, setSettled] = useState(false)
  const [replayKey, setReplayKey] = useState(0)

  // The intro reveal must end in a terminal state even if the browser pauses
  // animations in a hidden tab, so a timer forces the final frame.
  useEffect(() => {
    if ((window as unknown as Record<string, unknown>).__captureHold) return
    const t = window.setTimeout(() => setSettled(true), 1000)
    return () => window.clearTimeout(t)
  }, [replayKey])

  // Capture and review hook: replays the landing reveal on demand.
  useEffect(() => {
    const onReplay = () => {
      setSettled(false)
      setReplayKey((k) => k + 1)
    }
    window.addEventListener('demo:replay', onReplay)
    return () => window.removeEventListener('demo:replay', onReplay)
  }, [])

  useEffect(() => {
    document.title = active.title + ' · Larkspur Bakery'
  }, [active])

  const replyCount = s.threads.filter((t) => t.category === 'reply').length
  const draftCount = s.orders.filter((o) => o.status === 'draft').length
  const badge = (p: string) => (p === '/inbox' ? replyCount : p === '/orders' ? draftCount : 0)

  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <p className="banner">Demo. Fictional data. Resets hourly.</p>

      <div className="shell">
        <nav className="rail" aria-label="Screens">
          <div className="wordmark">
            <div className="name">
              Larkspur<span className="dot">.</span>
            </div>
            <div className="sub">Two shops · Denver</div>
          </div>
          <div className="nav">
            {SCREENS.map((x) => (
              <Link key={x.path} to={x.path} ariaCurrent={path === x.path}>
                <x.icon size={17} />
                {x.label}
                {badge(x.path) > 0 && <span className="badge">{badge(x.path)}</span>}
              </Link>
            ))}
          </div>
          <div className="rail-foot">
            <div className="rail-clock">
              <span className="time">{s.clock}</span>
              <span className="zone">AM · Denver</span>
            </div>
            <div className="rail-note" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span className="live-dot" />
              <span>Simulated morning, resets on the hour</span>
            </div>
            <hr className="hairline" style={{ margin: '4px 0' }} />
            <p className="rail-note">
              An example of the operational software Aviari builds for a small business.{' '}
              <a href="https://noahiberman.com" rel="noreferrer">
                noahiberman.com
              </a>
            </p>
          </div>
        </nav>

        <div className="main">
          <div className="mobile-top">
            <span className="name">
              Larkspur<span className="dot">.</span>
            </span>
            <span className="clock">{s.clock} AM · Denver</span>
          </div>
          <main id="main" className={'page route-in' + (settled ? ' settled' : '')} key={path + '·' + replayKey} tabIndex={-1}>
            <Suspense fallback={null}>
              {path === '/inbox' ? (
                <Inbox />
              ) : path === '/schedule' ? (
                <Schedule />
              ) : path === '/orders' ? (
                <Orders />
              ) : path === '/automations' ? (
                <Automations />
              ) : (
                <Brief />
              )}
            </Suspense>
          </main>
        </div>
      </div>

      <nav className="tabbar" aria-label="Screens">
        {SCREENS.map((x) => (
          <Link key={x.path} to={x.path} ariaCurrent={path === x.path}>
            <x.icon size={18} />
            {x.short}
          </Link>
        ))}
      </nav>

      <ToastStack />
    </>
  )
}
