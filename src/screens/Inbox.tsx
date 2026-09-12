import { useEffect, useMemo, useState } from 'react'
import { Empty, Seg } from '../components'
import type { Category } from '../demo/seed'
import { markDone, markRead, sendReply, takePendingThread, useDemo } from '../demo/store'
import { CheckIcon, ChevronLeft, InboxIcon, MailIcon, SendIcon, SmsIcon } from '../icons'

const TABS: { id: Category; label: string }[] = [
  { id: 'reply', label: 'Needs reply' },
  { id: 'fyi', label: 'FYI' },
  { id: 'done', label: 'Done' },
]

const CHIP: Record<Category, [string, string]> = {
  reply: ['chip-accent', 'Needs reply'],
  fyi: ['chip-muted', 'FYI'],
  done: ['chip-ok', 'Done'],
}

export default function Inbox() {
  const s = useDemo()
  const [tab, setTab] = useState<Category>('reply')
  const [selId, setSelId] = useState<string | null>(null)
  const [overlay, setOverlay] = useState(false)

  const counts = useMemo(() => {
    const c: Record<Category, number> = { reply: 0, fyi: 0, done: 0 }
    s.threads.forEach((t) => c[t.category]++)
    return c
  }, [s.threads])

  const list = s.threads.filter((t) => t.category === tab)
  const sel = s.threads.find((t) => t.id === selId) ?? null

  // A tap on the brief's message list lands on that exact thread.
  useEffect(() => {
    const p = takePendingThread()
    if (p) {
      const th = s.threads.find((t) => t.id === p)
      if (th) {
        setTab(th.category)
        setSelId(p)
        setOverlay(true)
        markRead(p)
      }
    } else if (!selId && list.length > 0 && window.innerWidth > 760) {
      setSelId(list[0].id)
      markRead(list[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pick = (id: string) => {
    setSelId(id)
    setOverlay(true)
    markRead(id)
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Inbox triage</h1>
          <p className="sub">Vendors, staff, and customers, sorted with a reply ready when one is needed.</p>
        </div>
        <Seg options={TABS} value={tab} onChange={(t) => setTab(t)} counts={counts} ariaLabel="Message category" />
      </div>

      <div className="inbox">
        <div className="card thread-list" role="list" aria-label="Threads">
          {list.length === 0 ? (
            <Empty
              icon={<InboxIcon size={20} />}
              text={tab === 'reply' ? 'Nothing needs a reply right now.' : tab === 'fyi' ? 'No notices at the moment.' : 'Replies you send land here.'}
            />
          ) : (
            list.map((t) => {
              const last = t.msgs[t.msgs.length - 1]
              return (
                <button
                  key={t.id}
                  type="button"
                  role="listitem"
                  className="thread-row"
                  aria-current={selId === t.id ? 'true' : undefined}
                  onClick={() => pick(t.id)}
                >
                  <span className={'unread' + (t.unread ? '' : ' read')} aria-hidden="true" />
                  <span className="tr-main">
                    <span className="tr-top">
                      <span className="tr-who">{t.who}</span>
                      <span className="tr-at">{last.at}</span>
                    </span>
                    <span className="tr-sub">{t.subject}</span>
                    <span className="tr-prev">{last.text}</span>
                  </span>
                </button>
              )
            })
          )}
        </div>

        {sel ? (
          <ThreadPane key={sel.id} id={sel.id} overlay={overlay} onBack={() => setOverlay(false)} />
        ) : (
          <div className="card thread-pane">
            <Empty icon={<MailIcon size={20} />} text="Pick a thread to read it here." />
          </div>
        )}
      </div>
    </>
  )
}

function ThreadPane({ id, overlay, onBack }: { id: string; overlay: boolean; onBack: () => void }) {
  const s = useDemo()
  const t = s.threads.find((x) => x.id === id)
  const [text, setText] = useState(t?.draft ?? '')
  const [sentAt, setSentAt] = useState<string | null>(null)
  useEffect(() => {
    setText(t?.draft ?? '')
  }, [t?.draft])
  if (!t) return null
  const [chipCls, chipLabel] = CHIP[t.category]

  const doSend = () => {
    if (!text.trim()) return
    sendReply(t.id, text)
    setSentAt(s.clock)
  }

  return (
    <div className={'card thread-pane' + (overlay ? ' overlay' : '')}>
      <div className="thread-head">
        <button type="button" className="btn btn-ghost btn-sm only-mobile" onClick={onBack} aria-label="Back to the thread list">
          <ChevronLeft size={14} />
        </button>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2>{t.subject}</h2>
          <p className="from">
            {t.who}
            {t.org ? ' · ' + t.org : ''} · {t.channel === 'email' ? 'email' : 'text'}
          </p>
        </div>
        <span className={'chip ' + chipCls} style={{ flex: 'none' }}>
          {t.channel === 'email' ? <MailIcon size={11} /> : <SmsIcon size={11} />}
          {chipLabel}
        </span>
      </div>

      <div className="bubbles">
        {t.msgs.map((m, i) => (
          <div key={i} className={'bubble' + (m.from === 'dana' ? ' out' : '') + (i === t.msgs.length - 1 ? ' pop' : '')}>
            {m.text}
            <span className="b-at">
              {m.from === 'dana' ? 'Dana · ' : ''}
              {m.at}
            </span>
          </div>
        ))}
        {sentAt && (
          <span className="sent-note pop">
            <CheckIcon size={13} /> Sent {sentAt}
          </span>
        )}
      </div>

      {t.category !== 'done' && (
        <div className="draft">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="eyebrow">{t.draft ? 'Drafted reply' : 'Reply'}</span>
            {t.draft && <span className="muted" style={{ fontSize: 11 }}>plain register, edit freely</span>}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-label={'Reply to ' + t.who}
            placeholder="Write a reply"
          />
          <div className="draft-actions">
            <button type="button" className="btn btn-primary btn-sm" onClick={doSend} disabled={!text.trim()}>
              <SendIcon size={13} /> Send
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => markDone(t.id)}>
              Move to done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
