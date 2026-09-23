import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useData } from '../lib/data'

const MAIN = [
  { to: '/', label: 'আজ', end: true },
  { to: '/purchase', label: 'কিনলাম' },
  { to: '/sale', label: 'বিক্রি' },
  { to: '/stock', label: 'স্টক' },
  { to: '/lookup', label: 'খুঁজো' },
]

const MORE = [
  { to: '/return', label: 'রিটার্ন' },
  { to: '/customers', label: 'কাস্টমার' },
  { to: '/suppliers', label: 'সাপ্লায়ার' },
  { to: '/labels', label: 'লেবেল' },
  { to: '/settings', label: 'দোকান' },
]

function linkClass({ isActive }: { isActive: boolean }) {
  return `side-link${isActive ? ' active' : ''}`
}

export function Layout() {
  const { user, logout } = useAuth()
  const { db } = useData()
  const navigate = useNavigate()
  const location = useLocation()
  const shop = db.shop
  const isLogin = location.pathname === '/login'
  const moreActive = MORE.some((m) => location.pathname.startsWith(m.to))

  if (isLogin) {
    return (
      <div className="auth-shell">
        <Outlet />
      </div>
    )
  }

  return (
    <div className={`app-frame${user ? ' signed-in' : ''}`}>
      {user && (
        <aside className="sidebar">
          <div className="sidebar-brand">
            <div className="brand-mark" aria-hidden />
            <div>
              <div className="brand-name">{shop.name || 'বাইক পার্টস'}</div>
              <div className="brand-sub">হিসাব ও স্টক</div>
            </div>
          </div>

          <nav className="side-nav" aria-label="মূল মেনু">
            <p className="nav-section">প্রতিদিন</p>
            {MAIN.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
                {item.label}
              </NavLink>
            ))}
            <p className="nav-section">আরও</p>
            {MORE.map((item) => (
              <NavLink key={item.to} to={item.to} className={linkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="sidebar-foot">
            <div className="user-chip">
              <strong>{user.name}</strong>
              <span>{user.email || user.phone || 'মালিক'}</span>
            </div>
            <button
              type="button"
              className="btn ghost block"
              onClick={() => {
                void logout().then(() => navigate('/login'))
              }}
            >
              বের হোন
            </button>
          </div>
        </aside>
      )}

      <div className="main-column">
        {user && (
          <header className="mobile-topbar">
            <div>
              <div className="brand-name">{shop.name || 'বাইক পার্টস'}</div>
              <div className="brand-sub">{user.name}</div>
            </div>
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                void logout().then(() => navigate('/login'))
              }}
            >
              বের হোন
            </button>
          </header>
        )}

        <main className="page-body">
          <Outlet />
        </main>

        {user && (
          <nav className="bottom-nav" aria-label="মোবাইল মেনু">
            <div className="bottom-nav-inner">
              {MAIN.slice(0, 4).map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                >
                  {item.label}
                </NavLink>
              ))}
              <NavLink
                to="/more"
                className={() => `nav-link${moreActive || location.pathname === '/more' ? ' active' : ''}`}
              >
                আরও
              </NavLink>
            </div>
          </nav>
        )}
      </div>
    </div>
  )
}
