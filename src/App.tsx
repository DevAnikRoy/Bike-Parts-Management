import { Navigate, Route, Routes } from 'react-router-dom'
import { CloudSetup } from './components/CloudSetup'
import { Layout } from './components/Layout'
import { useAuth } from './lib/auth'
import { useData } from './lib/data'
import { isDatabaseSetupError } from './lib/errors'
import { CustomersPage } from './pages/CustomersPage'
import { HomePage } from './pages/HomePage'
import { LabelsPage } from './pages/LabelsPage'
import { LoginPage } from './pages/LoginPage'
import { LookupPage } from './pages/LookupPage'
import { MorePage } from './pages/MorePage'
import { PurchasePage } from './pages/PurchasePage'
import { ReturnPage } from './pages/ReturnPage'
import { SalePage } from './pages/SalePage'
import { SettingsPage } from './pages/SettingsPage'
import { StockPage } from './pages/StockPage'
import { SuppliersPage } from './pages/SuppliersPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, ready, refresh, schemaError } = useAuth()
  const { loaded, error, retry } = useData()
  if (!ready || (user && !loaded)) {
    return (
      <div className="empty">
        <p className="muted">লোড হচ্ছে...</p>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />

  const setupMsg = !user.shop_id ? schemaError || error || 'ডাটাবেস প্রস্তুত নয়' : error
  if (setupMsg) {
    if (isDatabaseSetupError(setupMsg) || (!user.shop_id && isDatabaseSetupError(schemaError))) {
      return (
        <div className="card">
          <h2>সেটআপ বাকি</h2>
          <p className="muted">{setupMsg}</p>
          <CloudSetup
            showSql
            onRetry={() => {
              void refresh().then(() => retry())
            }}
          />
        </div>
      )
    }
    if (!user.shop_id) {
      return (
        <div className="card">
          <h2>দোকান খোলা যায়নি</h2>
          <p className="muted">{setupMsg}</p>
          <button
            type="button"
            className="btn block"
            onClick={() => {
              void refresh().then(() => retry())
            }}
          >
            আবার চেষ্টা
          </button>
        </div>
      )
    }
    return (
      <div className="card">
        <h2>ডাটা লোড হয়নি</h2>
        <p className="muted">{error}</p>
        <button type="button" className="btn block" onClick={() => retry()}>
          আবার চেষ্টা
        </button>
      </div>
    )
  }
  return children
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <HomePage />
            </RequireAuth>
          }
        />
        <Route
          path="/purchase"
          element={
            <RequireAuth>
              <PurchasePage />
            </RequireAuth>
          }
        />
        <Route
          path="/sale"
          element={
            <RequireAuth>
              <SalePage />
            </RequireAuth>
          }
        />
        <Route
          path="/stock"
          element={
            <RequireAuth>
              <StockPage />
            </RequireAuth>
          }
        />
        <Route
          path="/lookup"
          element={
            <RequireAuth>
              <LookupPage />
            </RequireAuth>
          }
        />
        <Route
          path="/return"
          element={
            <RequireAuth>
              <ReturnPage />
            </RequireAuth>
          }
        />
        <Route
          path="/more"
          element={
            <RequireAuth>
              <MorePage />
            </RequireAuth>
          }
        />
        <Route
          path="/reports"
          element={<Navigate to="/" replace />}
        />
        <Route
          path="/customers"
          element={
            <RequireAuth>
              <CustomersPage />
            </RequireAuth>
          }
        />
        <Route
          path="/suppliers"
          element={
            <RequireAuth>
              <SuppliersPage />
            </RequireAuth>
          }
        />
        <Route
          path="/settings"
          element={
            <RequireAuth>
              <SettingsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/labels"
          element={
            <RequireAuth>
              <LabelsPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
