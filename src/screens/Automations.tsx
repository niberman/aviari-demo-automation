import { Switch } from '../components'
import { toggleRule, useDemo } from '../demo/store'
import { Spark } from '../icons'

export default function Automations() {
  const s = useDemo()
  const log = [...s.runLog].reverse()

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Automations</h1>
          <p className="sub">The rules that run the routine work, written the way you would say them.</p>
        </div>
      </div>

      <div className="grid cols-12">
        <div className="span-7 rules">
          {s.rules.map((r) => (
            <section key={r.id} className={'card rule' + (r.enabled ? '' : ' off')} aria-label="Automation rule">
              <Spark size={16} style={{ color: r.enabled ? 'var(--accent)' : 'var(--muted)', flex: 'none', marginTop: 3 }} />
              <div className="r-main">
                <p className="r-text">{r.text}</p>
                <div className="r-meta">
                  <span className="mono">last ran {r.lastRun}</span>
                  <span className={'chip ' + (r.enabled ? 'chip-ok' : 'chip-muted')}>{r.enabled ? 'on' : 'off'}</span>
                </div>
              </div>
              <Switch on={r.enabled} onToggle={() => toggleRule(r.id)} label={'Rule: ' + r.text} />
            </section>
          ))}
        </div>

        <section className="card span-5" aria-label="Automation run log">
          <div className="card-head">
            <h2 className="card-title">Run log</h2>
            <span className="chip chip-ok">
              <span className="live-dot" style={{ width: 6, height: 6 }} /> Live
            </span>
          </div>
          <div className="log">
            {log.map((l, i) => (
              <div key={log.length - i} className={'log-line' + (i === 0 && s.freshLog > 0 ? ' fresh' : '')}>
                <span className="at">{l.at}</span>
                <span>{l.text}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
