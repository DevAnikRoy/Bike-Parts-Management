import { Link } from 'react-router-dom'

interface Props {
  title: string
  backTo?: string
}

export function PageHeader({ title, backTo = '/' }: Props) {
  return (
    <div className="page-title">
      <Link to={backTo} className="btn ghost no-print mobile-only-back">
        ← ফিরে
      </Link>
      <h1>{title}</h1>
    </div>
  )
}
