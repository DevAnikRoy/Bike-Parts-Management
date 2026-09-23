import { useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { useAuth } from '../lib/auth'
import { useData } from '../lib/data'
import { formatTk, trackingBn } from '../lib/format'
import type { PurchaseItemInput } from '../lib/types'

interface DraftItem extends PurchaseItemInput {
  key: string
  part_name: string
}

export function PurchasePage() {
  const { user } = useAuth()
  const { db, receivePurchase } = useData()
  const [supplierId, setSupplierId] = useState('')
  const [note, setNote] = useState('')
  const [partId, setPartId] = useState('')
  const [qty, setQty] = useState(1)
  const [buyPrice, setBuyPrice] = useState(0)
  const [serialText, setSerialText] = useState('')
  const [generateCodes, setGenerateCodes] = useState(true)
  const [items, setItems] = useState<DraftItem[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [lastUnits, setLastUnits] = useState<{ code: string; name: string }[]>([])

  const selected = db.parts.find((p) => p.id === partId)

  function onPartChange(id: string) {
    setPartId(id)
    const p = db.parts.find((x) => x.id === id)
    if (p) setBuyPrice(p.default_buy_price)
  }

  function addItem() {
    setError('')
    if (!partId) {
      setError('পার্ট বাছুন')
      return
    }
    if (qty < 1) {
      setError('পরিমাণ ১ বা তার বেশি হতে হবে')
      return
    }
    const part = db.parts.find((p) => p.id === partId)!
    const serials = serialText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean)

    if (part.tracking_mode === 'serialized' && serials.length && serials.length !== qty) {
      setError('সিরিয়াল সংখ্যা পরিমাণের সমান হতে হবে (অথবা খালি রেখে অটো কোড নিন)')
      return
    }

    setItems((prev) => [
      ...prev,
      {
        key: `${partId}-${Date.now()}`,
        part_id: partId,
        part_name: part.name_bn,
        qty,
        buy_price: buyPrice,
        serials: serials.length ? serials : undefined,
        generate_codes:
          part.tracking_mode === 'serialized'
            ? serials.length === 0
            : generateCodes && part.tracking_mode === 'optional_serial',
      },
    ])
    setSerialText('')
    setQty(1)
  }

  async function submit() {
    if (!user) return
    setError('')
    setSuccess('')
    try {
      const result = await receivePurchase({
        supplier_id: supplierId || null,
        note,
        items: items.map(({ part_id, qty, buy_price, serials, generate_codes }) => ({
          part_id,
          qty,
          buy_price,
          serials,
          generate_codes,
        })),
        user_id: user.id,
      })
      setSuccess(`কেনা সম্পন্ন! চালান ${result.invoice_no} · মোট ${formatTk(result.total)}`)
      setLastUnits(
        result.units.map((u) => ({
          code: u.unique_code,
          name: db.parts.find((p) => p.id === u.part_id)?.name_bn ?? '',
        })),
      )
      setItems([])
      setNote('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'কেনা ব্যর্থ')
    }
  }

  return (
    <>
      <PageHeader title="কিনলাম (স্টক যোগ)" />

      {success && <div className="success-banner">{success}</div>}

      <div className="card">
        <div className="field">
          <label>সাপ্লায়ার</label>
          <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">— বাছাই করুন (ঐচ্ছিক) —</option>
            {db.suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.phone})
              </option>
            ))}
          </select>
          <p className="muted">নতুন সাপ্লায়ার যোগ করতে সাপ্লায়ার মেনুতে যান।</p>
        </div>

        <div className="field">
          <label>পার্ট বাছুন</label>
          <select value={partId} onChange={(e) => onPartChange(e.target.value)}>
            <option value="">— পার্ট সিলেক্ট —</option>
            {db.parts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name_bn} ({p.oem_part_no}) · {trackingBn(p.tracking_mode)}
              </option>
            ))}
          </select>
        </div>

        {selected && (
          <p className="muted">
            ট্র্যাকিং: <span className="badge">{trackingBn(selected.tracking_mode)}</span>
            {selected.tracking_mode === 'serialized' &&
              ' — প্রতি পিসে আলাদা কোড লাগবে (অটো বা হাতে)'}
          </p>
        )}

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
            <label>কেনার দাম (৳)</label>
            <input
              type="number"
              min={0}
              value={buyPrice}
              onChange={(e) => setBuyPrice(Number(e.target.value))}
            />
          </div>
        </div>

        {selected && selected.tracking_mode !== 'qty_only' && (
          <>
            <div className="field">
              <label>সিরিয়াল/কোড (প্রতি লাইনে একটা) — খালি রাখলে অটো QR কোড</label>
              <textarea
                value={serialText}
                onChange={(e) => setSerialText(e.target.value)}
                placeholder="BP-XXXX অথবা OEM সিরিয়াল"
              />
            </div>
            {selected.tracking_mode === 'optional_serial' && (
              <label className="row" style={{ marginBottom: 12 }}>
                <input
                  type="checkbox"
                  checked={generateCodes}
                  onChange={(e) => setGenerateCodes(e.target.checked)}
                />
                অটো স্টিকার কোড তৈরি করুন
              </label>
            )}
          </>
        )}

        <button type="button" className="btn block" onClick={addItem}>
          তালিকায় যোগ করুন
        </button>
      </div>

      <div className="card">
        <h2>কেনার তালিকা ({items.length})</h2>
        {items.length === 0 ? (
          <div className="empty">এখনো কিছু যোগ হয়নি</div>
        ) : (
          <div className="list">
            {items.map((it) => (
              <div key={it.key} className="list-item">
                <div>
                  <strong>{it.part_name}</strong>
                  <span className="muted">
                    {it.qty} × {formatTk(it.buy_price)}
                    {it.serials?.length
                      ? ` · ${it.serials.length} সিরিয়াল`
                      : it.generate_codes
                        ? ' · অটো কোড'
                        : ''}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setItems((prev) => prev.filter((x) => x.key !== it.key))}
                >
                  মুছুন
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="field" style={{ marginTop: 12 }}>
          <label>নোট</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        {error && <p className="err">{error}</p>}

        <button
          type="button"
          className="btn block"
          disabled={!items.length}
          onClick={submit}
        >
          স্টকে যোগ করুন
        </button>
      </div>

      {lastUnits.length > 0 && (
        <div className="card">
          <h2>নতুন কোড (লেবেল প্রিন্ট করুন)</h2>
          <div className="list">
            {lastUnits.map((u) => (
              <div key={u.code} className="list-item">
                <div>
                  <strong>{u.code}</strong>
                  <span className="muted">{u.name}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="muted">লেবেল মেনু থেকে প্রিন্ট করতে পারবেন।</p>
        </div>
      )}
    </>
  )
}
