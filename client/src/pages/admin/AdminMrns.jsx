import { useEffect, useState } from 'react'
import { apiDownload, apiFetch } from '../../api'
import { useAuth } from '../../auth'

export default function AdminMrns() {
  const { token } = useAuth()
  const [mrns, setMrns] = useState([])
  const [vendors, setVendors] = useState([])
  const [shoes, setShoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [vendorId, setVendorId] = useState('')
  const [items, setItems] = useState([{ sku: '', qty: 1 }])
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    try {
      const [mrnData, vendorData, shoeData] = await Promise.all([
        apiFetch('/mrn', { token }),
        apiFetch('/admin/vendors', { token }),
        apiFetch('/shoes', { token }),
      ])
      setMrns(mrnData.mrns)
      setVendors(vendorData.vendors)
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

  const vendorSkus = shoes.filter((s) => String(s.vendorId) === String(vendorId))

  function updateItem(i, key, value) {
    setItems((list) => list.map((it, idx) => (idx === i ? { ...it, [key]: value } : it)))
  }

  async function handleCreate(e) {
    e.preventDefault()
    setFormError('')
    setBusy(true)
    try {
      await apiFetch('/mrn', {
        method: 'POST',
        body: {
          vendorId: Number(vendorId),
          items: items.map((it) => ({ sku: it.sku, qty: Number(it.qty) })),
        },
        token,
      })
      setFormOpen(false)
      setVendorId('')
      setItems([{ sku: '', qty: 1 }])
      await load()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setBusy(false)
    }
  }

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
        <button className="btn btn-primary" onClick={() => setFormOpen((o) => !o)}>
          {formOpen ? 'Close' : 'Create MRN'}
        </button>
      </div>
      {error && <p className="error">{error}</p>}

      {formOpen && (
        <div className="card form-card">
          <h3>New MRN</h3>
          <form onSubmit={handleCreate}>
            <label className="field" style={{ maxWidth: 320 }}>
              <span>Vendor</span>
              <select
                value={vendorId}
                onChange={(e) => {
                  setVendorId(e.target.value)
                  setItems([{ sku: '', qty: 1 }])
                }}
                required
              >
                <option value="">Select vendor…</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} — {v.businessName}
                  </option>
                ))}
              </select>
            </label>

            <p className="muted small">Received items (SKUs from this vendor's listings):</p>
            {items.map((it, i) => (
              <div className="item-row" key={i}>
                <select
                  value={it.sku}
                  onChange={(e) => updateItem(i, 'sku', e.target.value)}
                  disabled={!vendorId}
                  required
                >
                  <option value="">Select SKU…</option>
                  {vendorSkus.map((s) => (
                    <option key={s.id} value={s.sku}>
                      {s.sku} — {s.brand} {s.model}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={it.qty}
                  onChange={(e) => updateItem(i, 'qty', e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="btn btn-small"
                  onClick={() => setItems((l) => l.filter((_, idx) => idx !== i))}
                  disabled={items.length === 1}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn btn-small"
              onClick={() => setItems((l) => [...l, { sku: '', qty: 1 }])}
            >
              + Add item
            </button>

            <div className="form-actions" style={{ marginTop: '0.9rem' }}>
              {formError && <p className="error">{formError}</p>}
              <button className="btn btn-primary" disabled={busy}>
                {busy ? 'Creating…' : 'Create MRN'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card table-card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Vendor</th>
              <th>Items</th>
              <th>Status</th>
              <th>Signed by</th>
              <th>Signed at</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {mrns.map((m) => (
              <tr key={m.id}>
                <td>{m.id}</td>
                <td>
                  {m.vendorName}
                  <div className="muted small">{m.businessName}</div>
                </td>
                <td>{m.items.map((it) => `${it.sku} ×${it.qty}`).join(', ')}</td>
                <td>
                  <span className={`badge status-${m.status === 'signed' ? 'live' : 'submitted'}`}>
                    {m.status}
                  </span>
                </td>
                <td>{m.signedBy ?? '—'}</td>
                <td>{m.signedAt ?? '—'}</td>
                <td className="row-actions">
                  {m.status === 'signed' && (
                    <button className="btn btn-small" onClick={() => download(m)}>
                      PDF
                    </button>
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
