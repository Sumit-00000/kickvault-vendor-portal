import { useEffect, useState } from 'react'
import { apiFetch } from '../../api'
import { useAuth } from '../../auth'

export default function VendorReturns() {
  const { token } = useAuth()
  const [requests, setRequests] = useState([])
  const [shoes, setShoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [shoeId, setShoeId] = useState('')
  const [qty, setQty] = useState('1')
  const [reason, setReason] = useState('')
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    try {
      const [reqData, shoeData] = await Promise.all([
        apiFetch('/return-requests', { token }),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    setBusy(true)
    try {
      await apiFetch('/return-requests', {
        method: 'POST',
        body: { shoeId, qty: Number(qty), reason },
        token,
      })
      setShoeId('')
      setQty('1')
      setReason('')
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
        <h2>Return requests</h2>
      </div>
      {error && <p className="error">{error}</p>}

      <div className="card form-card">
        <h3>Raise a return request</h3>
        <form onSubmit={handleSubmit} className="pr-form">
          <label className="field">
            <span>Listing</span>
            <select value={shoeId} onChange={(e) => setShoeId(e.target.value)} required>
              <option value="">Select listing…</option>
              {shoes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id} — {s.brand} {s.model} (qty: {s.qty})
                </option>
              ))}
            </select>
          </label>
          <label className="field" style={{ minWidth: 110 }}>
            <span>Quantity</span>
            <input
              type="number"
              min="1"
              step="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Reason (optional)</span>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. item not selling"
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
        <p className="muted">No return requests yet.</p>
      ) : (
        <div className="card table-card">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Listing</th>
                <th className="num">Qty</th>
                <th>Reason</th>
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
                  <td className="num">{r.qty}</td>
                  <td>{r.reason ?? '—'}</td>
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
