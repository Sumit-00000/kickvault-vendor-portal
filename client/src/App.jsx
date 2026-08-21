import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth'
import RequireRole from './components/RequireRole'
import Login from './pages/Login'
import Register from './pages/Register'
import VendorDashboard from './pages/vendor/VendorDashboard'
import VendorKyc from './pages/vendor/VendorKyc'
import VendorListings from './pages/vendor/VendorListings'
import VendorMrns from './pages/vendor/VendorMrns'
import VendorInvoices from './pages/vendor/VendorInvoices'
import VendorPriceRequests from './pages/vendor/VendorPriceRequests'
import VendorChat from './pages/vendor/VendorChat'
import VendorReturns from './pages/vendor/VendorReturns'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminInventory from './pages/admin/AdminInventory'
import AdminMrns from './pages/admin/AdminMrns'
import AdminInvoices from './pages/admin/AdminInvoices'
import AdminPriceRequests from './pages/admin/AdminPriceRequests'
import AdminChat from './pages/admin/AdminChat'
import AdminReturns from './pages/admin/AdminReturns'

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
      <Route path="/register" element={<Register />} />

      <Route element={<RequireRole role="vendor" />}>
        <Route path="/vendor" element={<VendorDashboard />} />
        <Route path="/vendor/kyc" element={<VendorKyc />} />
        <Route path="/vendor/listings" element={<VendorListings />} />
        <Route path="/vendor/mrns" element={<VendorMrns />} />
        <Route path="/vendor/invoices" element={<VendorInvoices />} />
        <Route path="/vendor/price-requests" element={<VendorPriceRequests />} />
        <Route path="/vendor/returns" element={<VendorReturns />} />
        <Route path="/vendor/chat" element={<VendorChat />} />
      </Route>

      <Route element={<RequireRole role="admin" />}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/inventory" element={<AdminInventory />} />
        <Route path="/admin/mrns" element={<AdminMrns />} />
        <Route path="/admin/invoices" element={<AdminInvoices />} />
        <Route path="/admin/price-requests" element={<AdminPriceRequests />} />
        <Route path="/admin/returns" element={<AdminReturns />} />
        <Route path="/admin/chat" element={<AdminChat />} />
      </Route>

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  )
}
