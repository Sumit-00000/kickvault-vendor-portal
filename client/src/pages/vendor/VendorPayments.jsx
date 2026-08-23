import { useEffect, useState } from 'react'
import { apiFetch } from '../../api'
import { useAuth } from '../../auth'

export default function VendorPayments() {
  const { token } = useAuth()
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch('/payments/summary', { token })
      .then((data) => setSummary(data.summary))
      .catch((err) => setError(err.message))
  }, [token])

  if (error) return <p className="error">{error}</p>
  if (!summary) return <p className="page-loading">Loading…</p>

  return (
    <div>
      <div className="page-head">
        <h2>Payment summary</h2>
      </div>
      <p className="muted">
        Based on your non-cancelled invoices: sold quantity × settlement price,
        minus commission.
      </p>
      <div className="stats-row">
        <div className="card stat-card">
          <span className="stat-label">Sold quantity</span>
          <span className="stat-value">{summary.soldQty}</span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Gross</span>
          <span className="stat-value">{summary.gross}</span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Commission</span>
          <span className="stat-value">{summary.commission}</span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Net payable</span>
          <span className="stat-value">{summary.netPayable}</span>
        </div>
      </div>
    </div>
  )
}