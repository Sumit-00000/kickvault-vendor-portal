import { useEffect, useState } from 'react'
import { apiDownload, apiFetch } from '../../api'
import { useAuth } from '../../auth'

export default function VendorInvoices() {
  const { token } = useAuth()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch('/invoices', { token })
      .then((data) => setInvoices(data.invoices))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [token])

  async function download(inv) {
    try {
      await apiDownload(`/invoices/${inv.id}/pdf`, token, `${inv.id}.pdf`)
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <p className="page-loading">Loading…</p>

  return (
    <div>
      <div className="page-head">
        <h2>Invoices</h2>
      </div>
      {error && <p className="error">{error}</p>}
      {invoices.length === 0 ? (
        <p className="muted">No invoices yet.</p>
      ) : (
        <div className="card table-card">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Created</th>
                <th>Lines</th>
                <th className="num">Gross</th>
                <th className="num">Commission</th>
                <th className="num">Net payable</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td>{inv.id}</td>
                  <td>{inv.createdAt}</td>
                  <td>
                    {inv.lines.map((l) => `${l.sku} ×${l.qtySold} @ ${l.unitPrice}`).join(', ')}
                  </td>
                  <td className="num">{inv.totals.gross}</td>
                  <td className="num">
                    {inv.totals.commission} ({inv.commissionPct}%)
                  </td>
                  <td className="num">{inv.totals.net}</td>
                  <td>
                    <span className={`badge inv-${inv.status}`}>{inv.status}</span>
                  </td>
                  <td className="row-actions">
                    <button className="btn btn-small" onClick={() => download(inv)}>
                      PDF
                    </button>
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
