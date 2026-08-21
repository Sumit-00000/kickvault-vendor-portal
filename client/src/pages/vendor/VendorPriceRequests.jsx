import { useEffect, useState } from 'react'
import { apiFetch } from '../../api'
import { useAuth } from '../../auth'

export default function VendorPriceRequests() {
  const { token } = useAuth()
  const [requests, setRequests] = useState([])
  const [shoes, setShoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [shoeId, setShoeId] = useState('')
  const [requestedPrice, setRequestedPrice] = useState('')
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    try {
      const [reqData, shoeData] = await Promise.all([
        apiFetch('/price-requests', { token }),
        apiFetch('/shoes', { token }),
      ])
      setRequests(reqData.requests)
      setShoes(shoeData.shoes)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    setBusy(true)
    try {
      await apiFetch('/price-requests', {
        method: 'POST',
        body: { shoeId, requestedPrice: Number(requestedPrice) },
        token,
      })
      setShoeId('')
      setRequestedPrice('')
      await load()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <p className="page-loading">Loading…</p>

  return (
    <div>
      <div className="page-head">
        <h2>Price-change requests</h2>
      </div>
      {error && <p className="error">{error}</p>}

      <div className="card form-card">
        <h3>Request a new price</h3>
        <form onSubmit={handleSubmit} className="pr-form">
          <label className="field">
            <span>Listing</span>
            <select value={shoeId} onChange={(e) => setShoeId(e.target.value)} required>
              <option value="">Select listing…</option>
              {shoes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id} — {s.brand} {s.model} (admin price: {s.adminPrice ?? '—'})
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Requested price</span>
            <input
              type="number"
              min="0.01"
              step="any"
              value={requestedPrice}
              onChange={(e) => setRequestedPrice(e.target.value)}
              required
            />
          </label>
          <div className="form-actions">
            {formError && <p className="error">{formError}</p>}
            <button className="btn btn-primary" disabled={busy}>
              {busy ? 'Submitting…' : 'Submit request'}
            </button>
          </div>
        </form>
      </div>

      {requests.length === 0 ? (
        <p className="muted">No price requests yet.</p>
      ) : (
        <div className="card table-card">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Listing</th>
                <th className="num">Current admin price</th>
                <th className="num">Requested</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
