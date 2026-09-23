import { Navigate, Route, Routes } from 'react-router-dom'
import { CloudSetup } from './components/CloudSetup'
import { Layout } from './components/Layout'
import { useAuth } from './lib/auth'
import { useData } from './lib/data'
import { CustomersPage } from './pages/CustomersPage'
import { HomePage } from './pages/HomePage'
import { LabelsPage } from './pages/LabelsPage'
import { LoginPage } from './pages/LoginPage'
import { LookupPage } from './pages/LookupPage'
import { PurchasePage } from './pages/PurchasePage'
import { ReportsPage } from './pages/ReportsPage'
import { ReturnPage } from './pages/ReturnPage'
import { SalePage } from './pages/SalePage'
import { SettingsPage } from './pages/SettingsPage'
import { StockPage } from './pages/StockPage'
import { SuppliersPage } from './pages/SuppliersPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, ready, refresh } = useAuth()
  const { loaded, error, retry } = useData()
  if (!ready || (user && !loaded)) {
    return <p className="muted" style={{ marginTop: 24 }}>লোড হচ্ছে...</p>
  }
  if (!user) return <Navigate to="/login" replace />
  if (error || !user.shop_id) {
    return (
      <CloudSetup
        showSql
        onRetry={() => {
          void refresh().then(() => retry())
        }}
      />
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
          path="/reports"
          element={
            <RequireAuth>
              <ReportsPage />
            </RequireAuth>
          }
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
      </Route>
    </Routes>
  )
}
