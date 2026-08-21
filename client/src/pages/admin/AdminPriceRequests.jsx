import { useEffect, useState } from 'react'
import { apiFetch } from '../../api'
import { useAuth } from '../../auth'

export default function AdminPriceRequests() {
  const { token } = useAuth()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  async function load() {
    try {
      const data = await apiFetch('/price-requests', { token })
      setRequests(data.requests)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function respond(id, action) {
    setError('')
    setBusyId(id)
    try {
      await apiFetch(`/admin/price-requests/${id}/respond`, {
        method: 'POST',
        body: { action },
        token,
      })
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <p className="page-loading">Loading…</p>

  return (
    <div>
      <div className="page-head">
        <h2>Price-change requests</h2>
      </div>
      {error && <p className="error">{error}</p>}

      <div className="card table-card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Vendor</th>
              <th>Listing</th>
              <th className="num">Current admin price</th>
              <th className="num">Requested</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>
                  {r.vendorName}
                  <div className="muted small">{r.businessName}</div>
                </td>
                <td>
                  {r.shoeId}
                  <div className="muted small">
                    {r.brand} {r.model} ({r.sku})
                  </div>
                </td>
                <td className="num">{r.currentAdminPrice ?? '—'}</td>
                <td className="num">{r.requestedPrice}</td>
                <td>
                  <span className={`badge pr-${r.status}`}>{r.status}</span>
                </td>
                <td className="row-actions">
                  {r.status === 'pending' && (
                    <>
                      <button
                        className="btn btn-small"
                        disabled={busyId === r.id}
                        onClick={() => respond(r.id, 'approve')}
                      >
                        Approve
                      </button>
                      <button
                        className="btn btn-small btn-danger"
                        disabled={busyId === r.id}
                        onClick={() => respond(r.id, 'reject')}
                      >
                        Reject
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
