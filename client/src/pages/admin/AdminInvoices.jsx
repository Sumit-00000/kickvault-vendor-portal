import { useEffect, useState } from 'react'
import { apiDownload, apiFetch } from '../../api'
import { useAuth } from '../../auth'

export default function AdminInvoices() {
  const { token } = useAuth()
  const [invoices, setInvoices] = useState([])
  const [vendors, setVendors] = useState([])
  const [shoes, setShoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [vendorId, setVendorId] = useState('')
  const [commissionPct, setCommissionPct] = useState('12')
  const [lines, setLines] = useState([{ sku: '', qtySold: 1, unitPrice: '' }])
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    try {
      const [inv, ven, sh] = await Promise.all([
        apiFetch('/invoices', { token }),
        apiFetch('/admin/vendors', { token }),
        apiFetch('/shoes', { token }),
      ])
      setInvoices(inv.invoices)
      setVendors(ven.vendors)
      setShoes(sh.shoes)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const vendorShoes = shoes.filter((s) => String(s.vendorId) === String(vendorId))

  function updateLine(i, key, value) {
    setLines((list) =>
      list.map((l, idx) => {
        if (idx !== i) return l
        const next = { ...l, [key]: value }
        if (key === 'sku') {
          const shoe = vendorShoes.find((s) => s.sku === value)
          if (shoe) next.unitPrice = String(shoe.adminPrice ?? shoe.askingPrice)
        }
        return next
      }),
    )
  }

  async function handleCreate(e) {
    e.preventDefault()
    setFormError('')
    setBusy(true)
    try {
      await apiFetch('/invoices', {
        method: 'POST',
        body: {
          vendorId: Number(vendorId),
          commissionPct: Number(commissionPct),
          lines: lines.map((l) => ({
            sku: l.sku,
            qtySold: Number(l.qtySold),
            unitPrice: Number(l.unitPrice),
          })),
        },
        token,
      })
      setFormOpen(false)
      setVendorId('')
      setCommissionPct('12')
      setLines([{ sku: '', qtySold: 1, unitPrice: '' }])
      await load()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function action(id, verb) {
    setError('')
    try {
      await apiFetch(`/invoices/${id}/${verb}`, { method: 'POST', token })
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

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
        <button className="btn btn-primary" onClick={() => setFormOpen((o) => !o)}>
          {formOpen ? 'Close' : 'Create invoice'}
        </button>
      </div>
      {error && <p className="error">{error}</p>}

      {formOpen && (
        <div className="card form-card">
          <h3>New invoice</h3>
          <form onSubmit={handleCreate}>
            <div className="form-grid" style={{ maxWidth: 640 }}>
              <label className="field">
                <span>Vendor</span>
                <select
                  value={vendorId}
                  onChange={(e) => {
                    setVendorId(e.target.value)
                    setLines([{ sku: '', qtySold: 1, unitPrice: '' }])
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
              <label className="field">
                <span>Commission %</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  value={commissionPct}
                  onChange={(e) => setCommissionPct(e.target.value)}
                  required
                />
              </label>
            </div>

            <p className="muted small">Sold items (SKUs from this vendor's listings):</p>
            {lines.map((l, i) => (
              <div className="item-row" key={i}>
                <select
                  value={l.sku}
                  onChange={(e) => updateLine(i, 'sku', e.target.value)}
                  disabled={!vendorId}
                  required
                >
                  <option value="">Select SKU…</option>
                  {vendorShoes.map((s) => (
                    <option key={s.id} value={s.sku}>
                      {s.sku} — {s.brand} {s.model}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  step="1"
                  title="Qty sold"
                  value={l.qtySold}
                  onChange={(e) => updateLine(i, 'qtySold', e.target.value)}
                  required
                />
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  placeholder="Unit price"
                  title="Unit price"
                  value={l.unitPrice}
                  onChange={(e) => updateLine(i, 'unitPrice', e.target.value)}
                  required
                  style={{ width: '7.5rem' }}
                />
                <button
                  type="button"
                  className="btn btn-small"
                  onClick={() => setLines((list) => list.filter((_, idx) => idx !== i))}
                  disabled={lines.length === 1}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn btn-small"
              onClick={() => setLines((list) => [...list, { sku: '', qtySold: 1, unitPrice: '' }])}
            >
              + Add line
            </button>

            <div className="form-actions" style={{ marginTop: '0.9rem' }}>
              {formError && <p className="error">{formError}</p>}
              <button className="btn btn-primary" disabled={busy}>
                {busy ? 'Creating…' : 'Create invoice'}
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
              <th>Lines</th>
              <th className="num">Gross</th>
              <th className="num">Commission</th>
              <th className="num">Net</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <td>{inv.id}</td>
                <td>
                  {inv.vendorName}
                  <div className="muted small">{inv.businessName}</div>
                </td>
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
                  {inv.status === 'draft' && (
                    <button className="btn btn-small" onClick={() => action(inv.id, 'send')}>
                      Send
                    </button>
                  )}
                  {inv.status !== 'cancelled' && (
                    <button className="btn btn-small btn-danger" onClick={() => action(inv.id, 'cancel')}>
                      Cancel
                    </button>
                  )}
                  <button className="btn btn-small" onClick={() => download(inv)}>
                    PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
