import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth'
import RequireRole from './components/RequireRole'
import Login from './pages/Login'
import VendorDashboard from './pages/vendor/VendorDashboard'
import AdminDashboard from './pages/admin/AdminDashboard'

function HomeRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <p className="page-loading">Loading…</p>
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={user.role === 'admin' ? '/admin' : '/vendor'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<RequireRole role="vendor" />}>
        <Route path="/vendor" element={<VendorDashboard />} />
      </Route>

      <Route element={<RequireRole role="admin" />}>
        <Route path="/admin" element={<AdminDashboard />} />
      </Route>

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  )
}
