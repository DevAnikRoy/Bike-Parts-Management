import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'

const LINKS = [
  { to: '/lookup', title: 'খুঁজো', hint: 'সিরিয়াল বা পার্ট নম্বর' },
  { to: '/return', title: 'রিটার্ন', hint: 'কোড মিলিয়ে ফেরত' },
  { to: '/customers', title: 'কাস্টমার', hint: 'নাম ও ফোন' },
  { to: '/suppliers', title: 'সাপ্লায়ার', hint: 'যার কাছ থেকে কেনেন' },
  { to: '/labels', title: 'লেবেল', hint: 'কোড স্টিকার প্রিন্ট' },
  { to: '/settings', title: 'দোকান', hint: 'নাম, ঠিকানা, ফোন' },
]

export function MorePage() {
  return (
    <>
      <PageHeader title="আরও" />
      <div className="more-grid">
        {LINKS.map((l) => (
          <Link key={l.to} to={l.to} className="more-card">
            <strong>{l.title}</strong>
            <span className="muted">{l.hint}</span>
          </Link>
        ))}
      </div>
    </>
  )
}
