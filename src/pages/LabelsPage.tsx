import { useMemo, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { useData } from '../lib/data'

export function LabelsPage() {
  const { db } = useData()
  const [onlyInStock, setOnlyInStock] = useState(true)

  const units = useMemo(() => {
    return db.stock_units
      .filter((u) => (onlyInStock ? u.status === 'in_stock' : true))
      .slice()
      .reverse()
      .slice(0, 100)
  }, [db, onlyInStock])

  return (
    <>
      <PageHeader title="লেবেল প্রিন্ট" />

      <div className="card no-print">
        <p className="muted">
          কেনার সময় তৈরি হওয়া QR/কোড স্টিকার প্রিন্ট করুন। কোড কেটে পার্টের প্যাকেটে লাগান।
        </p>
        <label className="row" style={{ marginBottom: 12 }}>
          <input
            type="checkbox"
            checked={onlyInStock}
            onChange={(e) => setOnlyInStock(e.target.checked)}
          />
          শুধু স্টকে থাকা ইউনিট
        </label>
        <button type="button" className="btn block" onClick={() => window.print()}>
          প্রিন্ট করুন
        </button>
      </div>

      {units.length === 0 ? (
        <div className="card empty">
          এখনো কোনো সিরিয়াল কোড নেই। আগে সিরিয়ালাইজড পার্ট কিনুন।
        </div>
      ) : (
        <div
          className="card"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 12,
          }}
        >
          {units.map((u) => {
            const part = db.parts.find((p) => p.id === u.part_id)
            return (
              <div
                key={u.id}
                style={{
                  border: '1px dashed #333',
                  borderRadius: 8,
                  padding: 10,
                  textAlign: 'center',
                  breakInside: 'avoid',
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>
                  {part?.name_bn}
                </div>
                <div
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    margin: '8px 0',
                    wordBreak: 'break-all',
                  }}
                >
                  {u.unique_code}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#555' }}>
                  {part?.oem_part_no}
                </div>
                <div style={{ fontSize: '0.7rem' }}>{db.shop.name}</div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
