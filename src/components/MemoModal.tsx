import { useEffect } from 'react'
import { ShopLogo } from './ShopLogo'
import { formatDate, formatTk } from '../lib/format'
import type { AppDatabase, Sale } from '../lib/types'

export function MemoModal({
  sale,
  db,
  onClose,
}: {
  sale: Sale
  db: AppDatabase
  onClose: () => void
}) {
  const customer = sale.customer_id
    ? db.customers.find((c) => c.id === sale.customer_id)
    : undefined
  const saleLines = db.sale_lines.filter((l) => l.sale_id === sale.id)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="memo-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-toolbar no-print">
          <strong id="memo-modal-title">মেমো · {sale.invoice_no}</strong>
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn" onClick={() => window.print()}>
              প্রিন্ট
            </button>
            <button type="button" className="btn ghost" onClick={onClose}>
              বন্ধ
            </button>
          </div>
        </div>

        <div className="card memo-sheet memo-modal-sheet" id="memo-preview">
          <div className="memo-header">
            <ShopLogo svg={db.shop.logo_svg} name={db.shop.name} size="memo" />
            <div>
              <h2 className="memo-shop">{db.shop.name}</h2>
              <p className="muted memo-meta">
                {db.shop.address}
                {db.shop.phone ? ` · ${db.shop.phone}` : ''}
              </p>
            </div>
          </div>
          <p>
            <strong>মেমো:</strong> {sale.invoice_no}
            <br />
            <strong>তারিখ:</strong> {formatDate(sale.created_at)}
            {customer ? (
              <>
                <br />
                <strong>কাস্টমার:</strong> {customer.name}
                {customer.phone ? ` (${customer.phone})` : ''}
              </>
            ) : null}
            {sale.note?.trim() ? (
              <>
                <br />
                <strong>নোট:</strong> {sale.note}
              </>
            ) : null}
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
                {saleLines.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="muted">
                      লাইন পাওয়া যায়নি
                    </td>
                  </tr>
                ) : (
                  saleLines.map((l) => {
                    const part = db.parts.find((p) => p.id === l.part_id)
                    return (
                      <tr key={l.id}>
                        <td>{part?.name_bn ?? '—'}</td>
                        <td>{l.unique_code ?? '—'}</td>
                        <td>{l.qty}</td>
                        <td>{formatTk(l.line_total)}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
          <p className="memo-totals">
            <strong>মোট:</strong> {formatTk(sale.total)}
            {sale.discount > 0 ? (
              <>
                <br />
                <strong>ছাড়:</strong> {formatTk(sale.discount)}
              </>
            ) : null}
            <br />
            <strong>নেট:</strong> {formatTk(sale.total - sale.discount)}
            <br />
            <strong>পরিশোধ:</strong> {formatTk(sale.paid)}
          </p>
        </div>
      </div>
    </div>
  )
}
