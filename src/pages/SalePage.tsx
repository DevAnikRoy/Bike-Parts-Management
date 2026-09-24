import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { useAuth } from '../lib/auth'
import { useData } from '../lib/data'
import { findUnitByCode } from '../lib/queries'
import { formatDate, formatTk } from '../lib/format'
import type { CartItem } from '../lib/types'

export function SalePage() {
  const { user } = useAuth()
  const { db, completeSale, addCustomer, retry } = useData()
  const [customerId, setCustomerId] = useState('')
  const [partQ, setPartQ] = useState('')
  const [partId, setPartId] = useState('')
  const [qty, setQty] = useState(1)
  const [sellPrice, setSellPrice] = useState(0)
  const [code, setCode] = useState('')
  const [cart, setCart] = useState<(CartItem & { name: string })[]>([])
  const [discount, setDiscount] = useState(0)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [saleId, setSaleId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')

  const sale = saleId ? db.sales.find((s) => s.id === saleId) : null
  const saleLines = saleId ? db.sale_lines.filter((l) => l.sale_id === saleId) : []

  const qtyParts = useMemo(() => {
    const q = partQ.trim().toLowerCase()
    return db.parts
      .filter((p) => p.tracking_mode !== 'serialized')
      .filter((p) => {
        if (!q) return true
        return (
          p.name_bn.includes(partQ) ||
          p.name.toLowerCase().includes(q) ||
          p.oem_part_no.toLowerCase().includes(q)
        )
      })
  }, [db.parts, partQ])

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
    if (!Number.isFinite(qty) || qty < 1) {
      setError('পরিমাণ ১ বা তার বেশি হতে হবে')
      return
    }
    const part = db.parts.find((p) => p.id === partId)!
    if (part.tracking_mode === 'serialized') {
      setError('এই পার্টে সিরিয়াল/কোড স্ক্যান করতে হবে')
      return
    }
    const bal = db.stock_balances.find((b) => b.part_id === partId)
    const inCart = cart
      .filter((c) => c.part_id === partId && !c.stock_unit_id)
      .reduce((s, c) => s + c.qty, 0)
    if (!bal || bal.qty < inCart + qty) {
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

  async function createCustomer(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!newName.trim() || !newPhone.trim()) {
      setError('কাস্টমারের নাম ও ফোন দিন')
      return
    }
    setBusy(true)
    try {
      const id = await addCustomer({
        name: newName.trim(),
        phone: newPhone.trim(),
        address: '',
        note: '',
      })
      setCustomerId(id)
      setShowNewCustomer(false)
      setNewName('')
      setNewPhone('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'কাস্টমার সেভ হয়নি')
    } finally {
      setBusy(false)
    }
  }

  async function checkout() {
    if (!user) return
    setError('')
    setBusy(true)
    try {
      const sub = cart.reduce((s, c) => s + c.qty * c.sell_price, 0)
      const saleRow = await completeSale({
        customer_id: customerId || null,
        note,
        discount,
        paid: Math.max(0, sub - discount),
        items: cart,
        user_id: user.id,
      })
      setSaleId(saleRow.id)
      setCart([])
      setDiscount(0)
      setNote('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'বিক্রি ব্যর্থ')
    } finally {
      setBusy(false)
    }
  }

  const subtotal = cart.reduce((s, c) => s + c.qty * c.sell_price, 0)
  const due = Math.max(0, subtotal - discount)

  if (saleId && !sale) {
    return (
      <div className="card">
        <p className="muted">মেমো লোড হচ্ছে...</p>
        <button type="button" className="btn ghost" onClick={() => setSaleId(null)}>
          বাতিল করে নতুন বিক্রি
        </button>
      </div>
    )
  }

  if (sale) {
    const customer = sale.customer_id
      ? db.customers.find((c) => c.id === sale.customer_id)
      : null
    return (
      <>
        <div className="no-print">
          <PageHeader title="ক্যাশমেমো" />
          <div className="success-banner flow-success">
            <strong>বিক্রি হয়েছে</strong>
            <div className="row">
              <button type="button" className="btn" onClick={() => window.print()}>
                প্রিন্ট
              </button>
              <button type="button" className="btn ghost" onClick={() => setSaleId(null)}>
                নতুন বিক্রি
              </button>
              <Link to="/" className="btn ghost">
                আজকের হিসাব
              </Link>
            </div>
          </div>
        </div>
        <div className="card memo-sheet" id="memo">
          <h2 className="memo-shop">{db.shop.name}</h2>
          <p className="muted memo-meta">
            {db.shop.address}
            {db.shop.phone ? ` · ${db.shop.phone}` : ''}
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
          <p className="memo-totals">
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
        </div>
      </>
    )
  }

  return (
    <>
      <header className="page-hero">
        <PageHeader title="বিক্রি" />
        <p className="muted">আগে কোড স্ক্যান করুন। সাধারণ পার্ট পরে যোগ করা যাবে।</p>
      </header>

      {db.parts.length === 0 && (
        <div className="card">
          <p className="err">পার্ট ক্যাটালগ এখনো আসেনি।</p>
          <button type="button" className="btn block" onClick={() => retry()}>
            ক্যাটালগ আবার লোড
          </button>
        </div>
      )}

      <div className="flow-split">
        <section className="card flow-panel">
          <h2>পার্ট যোগ</h2>

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
            <button
              type="button"
              className="text-link"
              style={{ marginTop: 6, background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
              onClick={() => setShowNewCustomer((v) => !v)}
            >
              {showNewCustomer ? 'বন্ধ' : '+ নতুন কাস্টমার'}
            </button>
          </div>

          {showNewCustomer && (
            <form className="inline-box" onSubmit={(e) => void createCustomer(e)}>
              <div className="field">
                <label>নাম</label>
                <input value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div className="field">
                <label>ফোন</label>
                <input
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  inputMode="tel"
                />
              </div>
              <button type="submit" className="btn block" disabled={busy}>
                কাস্টমার সেভ
              </button>
            </form>
          )}

          <div className="scan-box">
            <div className="field" style={{ marginBottom: 0, flex: 1 }}>
              <label>সিরিয়াল / QR কোড</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="স্ক্যান বা লিখুন"
                onKeyDown={(e) => e.key === 'Enter' && addByCode()}
                autoFocus
              />
            </div>
            <button type="button" className="btn" onClick={addByCode}>
              যোগ
            </button>
          </div>

          <p className="muted" style={{ margin: '16px 0 8px' }}>
            অথবা পরিমাণভিত্তিক পার্ট
          </p>

          <div className="field">
            <label>খুঁজুন</label>
            <input
              value={partQ}
              onChange={(e) => setPartQ(e.target.value)}
              placeholder="নাম / OEM"
            />
          </div>
          <div className="field">
            <label>পার্ট</label>
            <select value={partId} onChange={(e) => onPartChange(e.target.value)}>
              <option value="">— পার্ট —</option>
              {qtyParts.map((p) => {
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
        </section>

        <section className="card flow-panel sticky-panel cart-sheet">
          <div className="card-head">
            <h2>কার্ট</h2>
            <span className="muted">{cart.length}</span>
          </div>

          {cart.length === 0 ? (
            <div className="empty compact">কোড স্ক্যান করে শুরু করুন</div>
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

          <p className="flow-total">
            মোট <strong>{formatTk(due)}</strong>
          </p>
          {error && <p className="err">{error}</p>}
          <button
            type="button"
            className="btn block accent-btn"
            disabled={!cart.length || busy}
            onClick={() => void checkout()}
          >
            {busy ? 'হচ্ছে...' : 'বিক্রি সম্পন্ন'}
          </button>
        </section>
      </div>
    </>
  )
}
