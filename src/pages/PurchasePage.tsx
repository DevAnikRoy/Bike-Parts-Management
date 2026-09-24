import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { PartThumb } from '../components/PartThumb'
import { useAuth } from '../lib/auth'
import { useData } from '../lib/data'
import { formatTk, trackingBn } from '../lib/format'
import { useToast } from '../lib/toast'
import type { PurchaseItemInput } from '../lib/types'

interface DraftItem extends PurchaseItemInput {
  key: string
  part_name: string
  part_name_en: string
}

export function PurchasePage() {
  const { user } = useAuth()
  const { db, receivePurchase, addSupplier, retry } = useData()
  const notify = useToast()
  const [supplierId, setSupplierId] = useState('')
  const [note, setNote] = useState('')
  const [partQ, setPartQ] = useState('')
  const [partId, setPartId] = useState('')
  const [qty, setQty] = useState(1)
  const [buyPrice, setBuyPrice] = useState(0)
  const [serialText, setSerialText] = useState('')
  const [generateCodes, setGenerateCodes] = useState(true)
  const [items, setItems] = useState<DraftItem[]>([])
  const [lastUnits, setLastUnits] = useState<{ code: string; name: string }[]>([])
  const [busy, setBusy] = useState(false)
  const [showNewSupplier, setShowNewSupplier] = useState(false)
  const [newSupName, setNewSupName] = useState('')
  const [newSupPhone, setNewSupPhone] = useState('')
  const [doneBanner, setDoneBanner] = useState('')

  const selected = db.parts.find((p) => p.id === partId)
  const filteredParts = useMemo(() => {
    const q = partQ.trim().toLowerCase()
    if (!q) return db.parts
    return db.parts.filter(
      (p) =>
        p.name_bn.includes(partQ) ||
        p.name.toLowerCase().includes(q) ||
        p.oem_part_no.toLowerCase().includes(q),
    )
  }, [db.parts, partQ])

  const listTotal = items.reduce((s, it) => s + it.qty * it.buy_price, 0)

  function onPartChange(id: string) {
    setPartId(id)
    const p = db.parts.find((x) => x.id === id)
    if (p) setBuyPrice(p.default_buy_price)
  }

  function addItem() {
    if (!partId) {
      notify.error('পার্ট বাছুন')
      return
    }
    if (!Number.isFinite(qty) || qty < 1) {
      notify.error('পরিমাণ ১ বা তার বেশি হতে হবে')
      return
    }
    const part = db.parts.find((p) => p.id === partId)!
    const serials = serialText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean)

    if (part.tracking_mode === 'serialized' && serials.length && serials.length !== qty) {
      notify.error('সিরিয়াল সংখ্যা পরিমাণের সমান হতে হবে (অথবা খালি রেখে অটো কোড নিন)')
      return
    }

    setItems((prev) => [
      ...prev,
      {
        key: `${partId}-${Date.now()}`,
        part_id: partId,
        part_name: part.name_bn,
        part_name_en: part.name,
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
    setDoneBanner('')
    notify.success('তালিকায় যোগ হয়েছে')
  }

  async function createSupplierInline(e: React.FormEvent) {
    e.preventDefault()
    if (!newSupName.trim() || !newSupPhone.trim()) {
      notify.error('সাপ্লায়ারের নাম ও ফোন দিন')
      return
    }
    setBusy(true)
    try {
      const id = await addSupplier({
        name: newSupName.trim(),
        phone: newSupPhone.trim(),
        address: '',
        note: '',
      })
      setSupplierId(id)
      setShowNewSupplier(false)
      setNewSupName('')
      setNewSupPhone('')
      notify.success('সাপ্লায়ার যোগ হয়েছে')
    } catch (err) {
      notify.fromError(err, 'সাপ্লায়ার সেভ হয়নি')
    } finally {
      setBusy(false)
    }
  }

  async function submit() {
    if (!user) return
    if (items.length === 0) {
      notify.error('কমপক্ষে একটি পার্ট যোগ করুন')
      return
    }
    setDoneBanner('')
    setBusy(true)
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
      const msg = `স্টকে যোগ হয়েছে · চালান ${result.invoice_no} · ${formatTk(result.total)}`
      setDoneBanner(msg)
      notify.success(msg)
      setLastUnits(
        result.units.map((u) => ({
          code: u.unique_code,
          name: db.parts.find((p) => p.id === u.part_id)?.name_bn ?? '',
        })),
      )
      setItems([])
      setNote('')
    } catch (err) {
      notify.fromError(err, 'কেনা সেভ হয়নি')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <header className="page-hero">
        <PageHeader title="কিনলাম" />
        <p className="muted">সাপ্লায়ার থেকে স্টক ঢোকান। সিরিয়াল লাগলে কোড নিজে তৈরি হবে।</p>
      </header>

      {db.parts.length === 0 && (
        <div className="card">
          <p className="err">পার্ট ক্যাটালগ এখনো আসেনি — স্টকে যোগ করা যাবে না।</p>
          <button type="button" className="btn block" onClick={() => retry()}>
            ক্যাটালগ আবার লোড
          </button>
        </div>
      )}

      {doneBanner && (
        <div className="success-banner flow-success">
          <div>
            <strong>{doneBanner}</strong>
          </div>
          <div className="row">
            <Link to="/labels" className="btn ghost">
              লেবেল প্রিন্ট
            </Link>
            <Link to="/sale" className="btn">
              এখন বিক্রি
            </Link>
          </div>
        </div>
      )}

      <div className="flow-split">
        <section className="card flow-panel">
          <h2>পার্ট যোগ</h2>

          <div className="field">
            <label>সাপ্লায়ার</label>
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">— ঐচ্ছিক —</option>
              {db.suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.phone})
                </option>
              ))}
            </select>
            <button
              type="button"
              className="text-link"
              style={{ marginTop: 6, background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
              onClick={() => setShowNewSupplier((v) => !v)}
            >
              {showNewSupplier ? 'বন্ধ করুন' : '+ নতুন সাপ্লায়ার এখানেই'}
            </button>
          </div>

          {showNewSupplier && (
            <form className="inline-box" onSubmit={(e) => void createSupplierInline(e)}>
              <div className="field">
                <label>নাম</label>
                <input value={newSupName} onChange={(e) => setNewSupName(e.target.value)} />
              </div>
              <div className="field">
                <label>ফোন</label>
                <input
                  value={newSupPhone}
                  onChange={(e) => setNewSupPhone(e.target.value)}
                  inputMode="tel"
                />
              </div>
              <button type="submit" className="btn block" disabled={busy}>
                সাপ্লায়ার সেভ
              </button>
            </form>
          )}

          <div className="field">
            <label>পার্ট খুঁজুন</label>
            <input
              value={partQ}
              onChange={(e) => setPartQ(e.target.value)}
              placeholder="নাম বা OEM নম্বর"
            />
          </div>
          <div className="field">
            <label>পার্ট বাছুন</label>
            <select value={partId} onChange={(e) => onPartChange(e.target.value)}>
              <option value="">— সিলেক্ট —</option>
              {filteredParts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name_bn} · {p.oem_part_no}
                </option>
              ))}
            </select>
            {selected && (
              <div className="part-select-preview">
                <PartThumb name={selected.name} label={selected.name_bn} size="sm" />
                <span>{selected.name_bn}</span>
              </div>
            )}
          </div>

          {selected && (
            <p className="muted">
              <span className="badge">{trackingBn(selected.tracking_mode)}</span>
              {selected.tracking_mode === 'serialized' && ' · খালি রাখলে অটো কোড'}
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
                <label>সিরিয়াল (প্রতি লাইনে একটা)</label>
                <textarea
                  value={serialText}
                  onChange={(e) => setSerialText(e.target.value)}
                  placeholder="খালি = অটো কোড"
                />
              </div>
              {selected.tracking_mode === 'optional_serial' && (
                <label className="row" style={{ marginBottom: 12 }}>
                  <input
                    type="checkbox"
                    checked={generateCodes}
                    onChange={(e) => setGenerateCodes(e.target.checked)}
                  />
                  অটো স্টিকার কোড
                </label>
              )}
            </>
          )}

          <button type="button" className="btn block" onClick={addItem}>
            তালিকায় যোগ
          </button>
        </section>

        <section className="card flow-panel sticky-panel">
          <div className="card-head">
            <h2>কেনার তালিকা</h2>
            <span className="muted">{items.length} লাইন</span>
          </div>

          {items.length === 0 ? (
            <div className="empty compact">বাঁদিক থেকে পার্ট যোগ করুন</div>
          ) : (
            <div className="list">
              {items.map((it) => (
                <div key={it.key} className="list-item">
                  <div className="part-row">
                    <PartThumb name={it.part_name_en} label={it.part_name} size="sm" />
                    <div>
                      <strong>{it.part_name}</strong>
                      <span className="muted">
                        {it.qty} × {formatTk(it.buy_price)}
                        {it.generate_codes ? ' · অটো কোড' : ''}
                      </span>
                    </div>
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

          <p className="flow-total">
            মোট <strong>{formatTk(listTotal)}</strong>
          </p>
          <button
            type="button"
            className="btn block"
            disabled={!items.length || busy}
            onClick={() => void submit()}
          >
            {busy ? 'যোগ হচ্ছে...' : 'স্টকে যোগ করুন'}
          </button>
        </section>
      </div>

      {lastUnits.length > 0 && (
        <section className="card">
          <div className="card-head">
            <h2>নতুন কোড</h2>
            <Link to="/labels" className="text-link">
              লেবেল পেজ
            </Link>
          </div>
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
        </section>
      )}
    </>
  )
}
