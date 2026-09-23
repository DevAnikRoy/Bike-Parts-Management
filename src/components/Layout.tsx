import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useData } from '../lib/data'

export function Layout() {
  const { user, logout } = useAuth()
  const { db } = useData()
  const navigate = useNavigate()
  const shop = db.shop

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-name">{shop.name}</div>
          <div className="brand-sub">
            {user ? `${user.name} · বাইক পার্টস হিসাব` : 'বাইক পার্টস হিসাব'}
          </div>
        </div>
        {user && (
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              void logout().then(() => navigate('/login'))
            }}
          >
            বের হোন
          </button>
        )}
      </header>

      <Outlet />

      {user && (
        <nav className="bottom-nav">
          <div className="bottom-nav-inner">
            <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              <span className="ico">🏠</span>
              হোম
            </NavLink>
            <NavLink to="/purchase" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              <span className="ico">📥</span>
              কিনলাম
            </NavLink>
            <NavLink to="/sale" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              <span className="ico">🛒</span>
              বিক্রি
            </NavLink>
            <NavLink to="/stock" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              <span className="ico">📦</span>
              স্টক
            </NavLink>
            <NavLink to="/lookup" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              <span className="ico">🔍</span>
              খুঁজো
            </NavLink>
          </div>
        </nav>
      )}
    </div>
  )
}
