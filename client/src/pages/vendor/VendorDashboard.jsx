import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../../api'
import { useAuth } from '../../auth'
import StatusBadge from '../../components/StatusBadge'

export default function VendorDashboard() {
  const { user, token } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch('/dashboard/vendor', { token })
      .then(setData)
      .catch((err) => setError(err.message))
  }, [token])

  if (error) return <p className="error">{error}</p>
  if (!data) return <p className="page-loading">Loading…</p>

  return (
    <div>
      <div className="page-head">
        <h2>Welcome, {user.name}</h2>
        <span className="muted">
          {user.businessName} · account <span className="badge">{user.status}</span>
        </span>
      </div>

      <div className="stats-row">
        <div className="card stat-card">
          <span className="stat-label">Listings</span>
          <span className="stat-value">{data.shoes.length}</span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Units sold</span>
          <span className="stat-value">{data.soldCount}</span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Pending payments</span>
          <span className="stat-value">{data.pendingPayments}</span>
          <span className="stat-sub">net of commission (draft + sent invoices)</span>
        </div>
      </div>

      <div className="page-head" style={{ marginTop: '1.5rem' }}>
        <h3 style={{ margin: 0 }}>My inventory</h3>
        <Link to="/vendor/listings" className="muted small">
          Manage listings →
        </Link>
      </div>
      {data.shoes.length === 0 ? (
        <p className="muted">
          No listings yet — <Link to="/vendor/listings">add your first listing</Link>.
        </p>
      ) : (
        <div className="card table-card">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Item</th>
                <th>Size</th>
                <th>SKU</th>
                <th className="num">Asking</th>
                <th className="num">Admin price</th>
                <th className="num">Qty</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.shoes.map((s) => (
                <tr key={s.id}>
                  <td>{s.id}</td>
                  <td>
                    {s.brand} {s.model}
                  </td>
                  <td>{s.size}</td>
                  <td>{s.sku}</td>
                  <td className="num">{s.askingPrice}</td>
                  <td className="num">{s.adminPrice ?? '—'}</td>
                  <td className="num">{s.qty}</td>
                  <td>
                    <StatusBadge status={s.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
