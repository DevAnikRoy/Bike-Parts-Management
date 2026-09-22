import { useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { dbApi } from '../lib/db'
import { formatDate, formatTk, statusBn } from '../lib/format'

export function LookupPage() {
  const [code, setCode] = useState('')
  const [result, setResult] = useState<ReturnType<typeof dbApi.lookupCode>>(null)
  const [searched, setSearched] = useState(false)

  function search() {
    setResult(dbApi.lookupCode(code))
    setSearched(true)
  }

  return (
    <>
      <PageHeader title="খুঁজো" />

      <div className="card">
        <p className="muted">
          সিরিয়াল, QR কোড বা OEM পার্ট নম্বর দিয়ে খুঁজুন — কেনা, বিক্রি, রিটার্ন সব দেখা যাবে।
        </p>
        <div className="field">
          <label>কোড / পার্ট নম্বর</label>
          <div className="row">
            <input
              style={{ flex: 1 }}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search()}
              placeholder="BP-XXXX বা 30410-KST-941"
            />
            <button type="button" className="btn" onClick={search}>
              খুঁজুন
            </button>
          </div>
        </div>
      </div>

      {searched && !result && (
        <div className="card empty">কিছু পাওয়া যায়নি</div>
      )}

      {result?.type === 'unit' && (
        <div className="card">
          <h2>{result.part?.name_bn}</h2>
          <p>
            <span className="badge">{statusBn(result.unit.status)}</span>
          </p>
          <p>
            <strong>কোড:</strong> {result.unit.unique_code}
            <br />
            <strong>OEM:</strong> {result.part?.oem_part_no}
            <br />
            <strong>কেনার দাম:</strong> {formatTk(result.unit.buy_price)}
            {result.unit.sell_price != null && (
              <>
                <br />
                <strong>বিক্রির দাম:</strong> {formatTk(result.unit.sell_price)}
              </>
            )}
          </p>

          <h2>কেনা</h2>
          {result.purchase ? (
            <p className="muted">
              চালান {result.purchase.invoice_no} · {formatDate(result.purchase.created_at)}
              {result.supplier && (
                <>
                  <br />
                  সাপ্লায়ার: {result.supplier.name} ({result.supplier.phone})
                </>
              )}
            </p>
          ) : (
            <p className="muted">কেনার তথ্য নেই</p>
          )}

          <h2>বিক্রি</h2>
          {result.sale ? (
            <p className="muted">
              মেমো {result.sale.invoice_no} · {formatDate(result.sale.created_at)}
              {result.customer && (
                <>
                  <br />
                  কাস্টমার: {result.customer.name} ({result.customer.phone})
                </>
              )}
            </p>
          ) : (
            <p className="muted">এখনো বিক্রি হয়নি</p>
          )}

          <h2>হিস্ট্রি</h2>
          <div className="list">
            {result.movements.map((m) => (
              <div key={m.id} className="list-item">
                <div>
                  <strong>{m.movement_type}</strong>
                  <span className="muted">
                    {formatDate(m.created_at)} · qty {m.qty_delta > 0 ? '+' : ''}
                    {m.qty_delta}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {result?.type === 'parts' && (
        <div className="list">
          {result.parts.map(({ part, balance, units_in_stock }) => (
            <div key={part.id} className="card">
              <strong>{part.name_bn}</strong>
              <div className="muted">{part.oem_part_no}</div>
              <p>
                স্টক: <strong>{balance?.qty ?? 0}</strong>
                {units_in_stock.length > 0 && (
                  <> · সিরিয়াল ইউনিট: {units_in_stock.length}</>
                )}
              </p>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
