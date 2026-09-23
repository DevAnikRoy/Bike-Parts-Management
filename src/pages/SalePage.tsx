import { useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { useAuth } from '../lib/auth'
import { useData } from '../lib/data'
import { findUnitByCode } from '../lib/queries'
import { formatDate, formatTk } from '../lib/format'
import type { CartItem } from '../lib/types'

export function SalePage() {
  const { user } = useAuth()
  const { db, completeSale } = useData()
  const [customerId, setCustomerId] = useState('')
  const [partId, setPartId] = useState('')
  const [qty, setQty] = useState(1)
  const [sellPrice, setSellPrice] = useState(0)
  const [code, setCode] = useState('')
  const [cart, setCart] = useState<(CartItem & { name: string })[]>([])
  const [discount, setDiscount] = useState(0)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [saleId, setSaleId] = useState<string | null>(null)

  const sale = saleId ? db.sales.find((s) => s.id === saleId) : null
  const saleLines = saleId
    ? db.sale_lines.filter((l) => l.sale_id === saleId)
    : []

  function onPartChange(id: string) {
    setPartId(id)
    const bal = db.stock_balances.find((b) => b.part_id === id)
    const part = db.parts.find((p) => p.id === id)
    setSellPrice(bal?.sell_price ?? part?.default_sell_price ?? 0)
  }

  function addByCode() {
    setError('')
    const unit = findUnitByCode(db, code)
    if (!unit) {
      setError('এই কোড স্টকে নেই')
      return
    }
    if (unit.status !== 'in_stock') {
      setError('এই কোড ইতিমধ্যে বিক্রি/ব্যবহৃত')
      return
    }
    if (cart.some((c) => c.stock_unit_id === unit.id)) {
      setError('কার্টে আগে থেকেই আছে')
      return
    }
    const part = db.parts.find((p) => p.id === unit.part_id)!
    const bal = db.stock_balances.find((b) => b.part_id === unit.part_id)
    setCart((prev) => [
      ...prev,
      {
        part_id: unit.part_id,
        name: part.name_bn,
        qty: 1,
        sell_price: bal?.sell_price ?? part.default_sell_price,
        stock_unit_id: unit.id,
        unique_code: unit.unique_code,
      },
    ])
    setCode('')
  }

  function addByPart() {
    setError('')
    if (!partId) {
      setError('পার্ট বাছুন')
      return
    }
    const part = db.parts.find((p) => p.id === partId)!
    if (part.tracking_mode === 'serialized') {
      setError('এই পার্টে সিরিয়াল/কোড স্ক্যান করতে হবে')
      return
    }
    const bal = db.stock_balances.find((b) => b.part_id === partId)
    if (!bal || bal.qty < qty) {
      setError('পর্যাপ্ত স্টক নেই')
      return
    }
    setCart((prev) => [
      ...prev,
      {
        part_id: partId,
        name: part.name_bn,
        qty,
        sell_price: sellPrice,
      },
    ])
    setQty(1)
  }

  async function checkout() {
    if (!user) return
    setError('')
    try {
      const sub = cart.reduce((s, c) => s + c.qty * c.sell_price, 0)
      const sale = await completeSale({
        customer_id: customerId || null,
        note,
        discount,
        paid: Math.max(0, sub - discount),
        items: cart,
        user_id: user.id,
      })
      setSaleId(sale.id)
      setCart([])
      setDiscount(0)
      setNote('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'বিক্রি ব্যর্থ')
    }
  }

  const subtotal = cart.reduce((s, c) => s + c.qty * c.sell_price, 0)

  if (saleId && !sale) {
    return <p className="muted" style={{ marginTop: 24 }}>মেমো লোড হচ্ছে...</p>
  }

  if (sale) {
    const customer = sale.customer_id
      ? db.customers.find((c) => c.id === sale.customer_id)
      : null
    return (
      <>
        <PageHeader title="ক্যাশমেমো" />
        <div className="success-banner">বিক্রি হয়েছে ✓</div>
        <div className="card" id="memo">
          <h2 style={{ textAlign: 'center' }}>{db.shop.name}</h2>
          <p className="muted" style={{ textAlign: 'center', marginTop: 0 }}>
            {db.shop.address} · {db.shop.phone}
          </p>
          <p>
            <strong>মেমো:</strong> {sale.invoice_no}
            <br />
            <strong>তারিখ:</strong> {formatDate(sale.created_at)}
            {customer && (
              <>
                <br />
                <strong>কাস্টমার:</strong> {customer.name} ({customer.phone})
              </>
            )}
          </p>
          <div className="table-wrap">
            <table className="simple">
              <thead>
                <tr>
                  <th>পার্ট</th>
                  <th>কোড</th>
                  <th>পরিমাণ</th>
                  <th>মোট</th>
                </tr>
              </thead>
              <tbody>
                {saleLines.map((l) => {
                  const part = db.parts.find((p) => p.id === l.part_id)
                  return (
                    <tr key={l.id}>
                      <td>{part?.name_bn}</td>
                      <td>{l.unique_code ?? '—'}</td>
                      <td>{l.qty}</td>
                      <td>{formatTk(l.line_total)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p>
            <strong>মোট:</strong> {formatTk(sale.total)}
            {sale.discount > 0 && (
              <>
                <br />
                <strong>ছাড়:</strong> {formatTk(sale.discount)}
              </>
            )}
            <br />
            <strong>পরিশোধ:</strong> {formatTk(sale.paid)}
          </p>
          <div className="row no-print">
            <button type="button" className="btn" onClick={() => window.print()}>
              প্রিন্ট
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => setSaleId(null)}
            >
              নতুন বিক্রি
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader title="বিক্রি করলাম" />

      <div className="card">
        <div className="field">
          <label>কাস্টমার (ঐচ্ছিক)</label>
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">— বাছাই করুন —</option>
            {db.customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.phone})
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>সিরিয়াল / QR কোড স্ক্যান বা লিখুন</label>
          <div className="row">
            <input
              style={{ flex: 1 }}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="BP-XXXX"
              onKeyDown={(e) => e.key === 'Enter' && addByCode()}
            />
            <button type="button" className="btn" onClick={addByCode}>
              যোগ
            </button>
          </div>
        </div>

        <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '16px 0' }} />

        <div className="field">
          <label>অথবা সাধারণ পার্ট (পরিমাণ ভিত্তিক)</label>
          <select value={partId} onChange={(e) => onPartChange(e.target.value)}>
            <option value="">— পার্ট —</option>
            {db.parts
              .filter((p) => p.tracking_mode !== 'serialized')
              .map((p) => {
                const bal = db.stock_balances.find((b) => b.part_id === p.id)
                return (
                  <option key={p.id} value={p.id}>
                    {p.name_bn} · স্টক {bal?.qty ?? 0}
                  </option>
                )
              })}
          </select>
        </div>
        <div className="row">
          <div className="field" style={{ flex: 1 }}>
            <label>পরিমাণ</label>
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
            />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>বিক্রির দাম</label>
            <input
              type="number"
              min={0}
              value={sellPrice}
              onChange={(e) => setSellPrice(Number(e.target.value))}
            />
          </div>
        </div>
        <button type="button" className="btn block" onClick={addByPart}>
          কার্টে যোগ
        </button>
      </div>

      <div className="card">
        <h2>কার্ট ({cart.length})</h2>
        {cart.length === 0 ? (
          <div className="empty">আগে স্টক থেকে পার্ট যোগ করুন</div>
        ) : (
          <div className="list">
            {cart.map((c, i) => (
              <div key={`${c.part_id}-${c.unique_code ?? i}`} className="list-item">
                <div>
                  <strong>{c.name}</strong>
                  <span className="muted">
                    {c.qty} × {formatTk(c.sell_price)}
                    {c.unique_code ? ` · ${c.unique_code}` : ''}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setCart((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  মুছুন
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="field" style={{ marginTop: 12 }}>
          <label>ছাড় (৳)</label>
          <input
            type="number"
            min={0}
            value={discount}
            onChange={(e) => setDiscount(Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label>নোট</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        <p>
          <strong>মোট: {formatTk(Math.max(0, subtotal - discount))}</strong>
        </p>
        {error && <p className="err">{error}</p>}
        <button
          type="button"
          className="btn block"
          disabled={!cart.length}
          onClick={checkout}
        >
          বিক্রি সম্পন্ন করুন
        </button>
      </div>
    </>
  )
}
