import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth'
import Layout from './Layout'

export default function RequireRole({ role }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <p className="page-loading">Loading…</p>
  }
  if (!user) {
    return <Navigate to="/login" replace />
  }
  if (user.role !== role) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/vendor'} replace />
  }
  return <Layout />
}
