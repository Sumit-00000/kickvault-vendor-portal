import { useEffect, useState } from 'react'
import { apiFetch } from '../../api'
import { useAuth } from '../../auth'

export default function AdminPayments() {
  const { token } = useAuth()
  const [summaries, setSummaries] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch('/payments/summary', { token })
      .then((data) => setSummaries(data.summaries))
      .catch((err) => setError(err.message))
  }, [token])

  if (error) return <p className="error">{error}</p>
  if (!summaries) return <p className="page-loading">Loading…</p>

  return (
    <div>
      <div className="page-head">
        <h2>Payment summary</h2>
      </div>
      <p className="muted">
        Per vendor, from non-cancelled invoices: sold quantity × settlement
        price, minus commission.
      </p>
      <div className="card table-card">
        <table>
          <thead>
            <tr>
              <th>Vendor</th>
              <th className="num">Sold qty</th>
              <th className="num">Gross</th>
              <th className="num">Commission</th>
              <th className="num">Net payable</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((s) => (
              <tr key={s.vendorId}>
                <td>
                  {s.vendorName}
                  <div className="muted small">{s.businessName}</div>
                </td>
                <td className="num">{s.soldQty}</td>
                <td className="num">{s.gross}</td>
                <td className="num">{s.commission}</td>
                <td className="num">{s.netPayable}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}