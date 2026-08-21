import { useEffect, useState } from 'react'
import { apiDownload, apiFetch } from '../../api'
import { useAuth } from '../../auth'

function SignForm({ mrn, token, onSigned }) {
  const { user } = useAuth()
  const [accepted, setAccepted] = useState(false)
  const [name, setName] = useState(user.name)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSign(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await apiFetch(`/mrn/${mrn.id}/sign`, {
        method: 'POST',
        body: { accepted, name },
        token,
      })
      onSigned()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSign} className="sign-form">
      <label className="check-field">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          required
        />
        <span>
          I confirm receipt of the items listed above and sign this MRN.
        </span>
      </label>
      <div className="sign-row">
        <label className="field sign-name">
          <span>Signed by (name)</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <button className="btn btn-primary" disabled={busy || !accepted}>
          {busy ? 'Signing…' : 'Sign MRN'}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
    </form>
  )
}

export default function VendorMrns() {
  const { token } = useAuth()
  const [mrns, setMrns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    try {
      const data = await apiFetch('/mrn', { token })
      setMrns(data.mrns)
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

  async function download(mrn) {
    try {
      await apiDownload(`/mrn/${mrn.id}/pdf`, token, `${mrn.id}.pdf`)
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <p className="page-loading">Loading…</p>

  return (
    <div>
      <div className="page-head">
        <h2>Material Receiving Notes</h2>
      </div>
      {error && <p className="error">{error}</p>}
      {mrns.length === 0 && <p className="muted">No MRNs yet.</p>}

      {mrns.map((mrn) => (
        <div className="card mrn-card" key={mrn.id}>
          <div className="mrn-head">
            <h3>{mrn.id}</h3>
            <span className={`badge status-${mrn.status === 'signed' ? 'live' : 'submitted'}`}>
              {mrn.status}
            </span>
          </div>
          <p className="muted small">Created {mrn.createdAt}</p>
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Item</th>
                <th className="num">Qty</th>
              </tr>
            </thead>
            <tbody>
              {mrn.items.map((it, i) => (
                <tr key={i}>
                  <td>{it.sku}</td>
                  <td>{it.brand ? `${it.brand} ${it.model}` : '—'}</td>
                  <td className="num">{it.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {mrn.status === 'signed' ? (
            <div className="mrn-signed">
              <p className="success">
                ✓ Signed by {mrn.signedBy} at {mrn.signedAt}
              </p>
              <button className="btn" onClick={() => download(mrn)}>
                Download signed PDF
              </button>
            </div>
          ) : (
            <SignForm mrn={mrn} token={token} onSigned={load} />
          )}
        </div>
      ))}
    </div>
  )
}
