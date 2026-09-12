import { Empty, useFlash } from '../components'
import { fmtMoney, type Order } from '../demo/seed'
import { orderPdf, downloadPdf } from '../demo/pdf'
import { sendOrder, useDemo } from '../demo/store'
import { BoxIcon, CheckIcon, DownloadIcon, SendIcon } from '../icons'

const DENVER = 'America/Denver'

export default function Orders() {
  const s = useDemo()
  const orders = [...s.orders].sort((a, b) => (a.status === b.status ? 0 : a.status === 'draft' ? -1 : 1))

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Vendor orders</h1>
          <p className="sub">Drafts build from sales pace and par levels. Sending produces the PDF and files it.</p>
        </div>
      </div>

      <div className="orders-wrap">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {orders.length === 0 ? (
            <div className="card">
              <Empty
                icon={<BoxIcon size={20} />}
                text="No orders yet."
                hint="Rules draft them when an item falls below par."
              />
            </div>
          ) : (
            orders.map((o) => <OrderCard key={o.id} order={o} />)
          )}
        </div>

        <section className="card" aria-label="Par levels and pace">
          <div className="card-head">
            <h2 className="card-title">Pars and pace</h2>
            <span className="muted" style={{ fontSize: 11.5 }}>from the register feed</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Shop</th>
                  <th className="num">Par</th>
                  <th className="num">On hand</th>
                  <th className="num">Days left</th>
                </tr>
              </thead>
              <tbody>
                {s.items.map((i) => (
                  <ParLine key={i.id} id={i.id} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  )
}

function ParLine({ id }: { id: string }) {
  const s = useDemo()
  const i = s.items.find((x) => x.id === id)
  const flash = useFlash(i?.onHand)
  if (!i) return null
  const low = i.onHand < i.par
  const daysLeft = i.pace > 0 ? Math.round((i.onHand / i.pace) * 10) / 10 : 9
  return (
    <tr>
      <td>{i.name}</td>
      <td className="muted">{i.locId === 'hl' ? 'HL' : 'FP'}</td>
      <td className="num">{i.par}</td>
      <td className={'num' + (low ? ' low' : '') + flash}>{i.onHand}</td>
      <td className={'num' + (daysLeft < 1.5 ? ' low' : '')}>{daysLeft}d</td>
    </tr>
  )
}

function OrderCard({ order }: { order: Order }) {
  const s = useDemo()
  const vendor = s.vendors.find((v) => v.id === order.vendorId)
  const total = order.lines.reduce((a, l) => a + l.cost, 0)
  const sent = order.status === 'sent'

  const pdfName = order.po.toLowerCase() + '-' + (vendor?.name ?? 'vendor').toLowerCase().replace(/[^a-z]+/g, '-') + '.pdf'
  const dateLabel = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: DENVER,
  })

  const makePdf = () => {
    if (!vendor) return
    downloadPdf(pdfName, orderPdf(order, vendor, dateLabel))
  }

  const doSend = () => {
    makePdf()
    sendOrder(order.id)
  }

  return (
    <section className={'card' + (sent ? '' : ' lift')} aria-label={'Order for ' + vendor?.name}>
      <div className="card-head">
        <div>
          <h2 className="card-title">{vendor?.name}</h2>
          <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>
            {vendor?.kind} · <span className="mono">{order.po}</span>
          </div>
        </div>
        {sent ? (
          <span className="chip chip-ok">
            <CheckIcon size={11} /> Sent {order.sentAt}
          </span>
        ) : (
          <span className="chip chip-muted">Draft</span>
        )}
      </div>
      <ul className="order-lines">
        {order.lines.map((l, i) => (
          <li key={i} className={i === order.lines.length - 1 ? 'pop' : ''}>
            <span>{l.itemName}</span>
            <span className="q">
              {l.qty} {l.unit} · {fmtMoney(l.cost)}
            </span>
          </li>
        ))}
      </ul>
      <div className="order-foot">
        <span className="mono" style={{ fontSize: 14 }}>{fmtMoney(total)}</span>
        <span className="muted" style={{ fontSize: 11.5 }}>estimated</span>
        <span style={{ flex: 1 }} />
        {sent ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={makePdf}>
            <DownloadIcon size={13} /> Download PDF
          </button>
        ) : (
          <button type="button" className="btn btn-primary btn-sm" onClick={doSend}>
            <SendIcon size={13} /> Send order
          </button>
        )}
      </div>
      <p className="order-src">{order.source}</p>
    </section>
  )
}
