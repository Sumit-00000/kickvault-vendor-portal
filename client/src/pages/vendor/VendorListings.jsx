import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '../../api'
import { useAuth } from '../../auth'
import StatusBadge from '../../components/StatusBadge'

const EMPTY_FORM = {
  brand: '',
  model: '',
  size: '',
  sku: '',
  condition: '',
  askingPrice: '',
  qty: '',
}

export default function VendorListings() {
  const { token } = useAuth()
  const [shoes, setShoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [bulkResult, setBulkResult] = useState(null)
  const fileRef = useRef(null)

  async function load() {
    try {
      const data = await apiFetch('/shoes', { token })
      setShoes(data.shoes)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setFormOpen(true)
  }

  function openEdit(shoe) {
    setEditingId(shoe.id)
    setForm({
      brand: shoe.brand,
      model: shoe.model,
      size: shoe.size,
      sku: shoe.sku,
      condition: shoe.condition,
      askingPrice: String(shoe.askingPrice),
      qty: String(shoe.qty),
    })
    setFormError('')
    setFormOpen(true)
  }

  function update(key) {
    return (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    setBusy(true)
    try {
      const body = { ...form, askingPrice: Number(form.askingPrice), qty: Number(form.qty) }
      if (editingId) {
        await apiFetch(`/shoes/${editingId}`, { method: 'PATCH', body, token })
      } else {
        await apiFetch('/shoes', { method: 'POST', body, token })
      }
      setFormOpen(false)
      await load()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(id) {
    try {
      await apiFetch(`/shoes/${id}`, { method: 'DELETE', token })
      setConfirmDeleteId(null)
      await load()
    } catch (err) {
      setConfirmDeleteId(null)
      setError(err.message)
    }
  }

  async function handleBulkFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setBulkResult(null)
    setError('')
    try {
      const text = await file.text()
      let data
      if (file.name.toLowerCase().endsWith('.json')) {
        data = await apiFetch('/shoes/bulk', {
          method: 'POST',
          body: JSON.parse(text),
          token,
        })
      } else {
        data = await apiFetch('/shoes/bulk', {
          method: 'POST',
          bodyRaw: text,
          contentType: 'text/csv',
          token,
        })
      }
      setBulkResult({ ok: true, message: `${data.created} listing(s) uploaded` })
      await load()
    } catch (err) {
      setBulkResult({ ok: false, message: err.message })
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  if (loading) return <p className="page-loading">Loading…</p>

  return (
    <div>
      <div className="page-head">
        <h2>My listings</h2>
        <div className="page-actions">
          <button
            className="btn"
            type="button"
            onClick={() => fileRef.current?.click()}
          >
            Bulk upload (CSV/JSON)
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.json"
            style={{ display: 'none' }}
            onChange={handleBulkFile}
          />
          <button className="btn btn-primary" type="button" onClick={openCreate}>
            Add listing
          </button>
        </div>
      </div>

      {bulkResult && (
        <p className={bulkResult.ok ? 'success' : 'error'}>{bulkResult.message}</p>
      )}
      {error && <p className="error">{error}</p>}

      {formOpen && (
        <div className="card form-card">
          <h3>{editingId ? `Edit ${editingId}` : 'New listing'}</h3>
          <form onSubmit={handleSubmit} className="form-grid">
            <label className="field">
              <span>Brand</span>
              <input value={form.brand} onChange={update('brand')} required />
            </label>
            <label className="field">
              <span>Model</span>
              <input value={form.model} onChange={update('model')} required />
            </label>
            <label className="field">
              <span>Size</span>
              <input value={form.size} onChange={update('size')} placeholder="US 9" required />
            </label>
            <label className="field">
              <span>SKU</span>
              <input value={form.sku} onChange={update('sku')} required />
            </label>
            <label className="field">
              <span>Condition</span>
              <input value={form.condition} onChange={update('condition')} placeholder="New / Used - Good" required />
            </label>
            <label className="field">
              <span>Asking price</span>
              <input type="number" min="1" step="any" value={form.askingPrice} onChange={update('askingPrice')} required />
            </label>
            <label className="field">
              <span>Quantity</span>
              <input type="number" min="1" step="1" value={form.qty} onChange={update('qty')} required />
            </label>
            <div className="form-actions">
              {formError && <p className="error">{formError}</p>}
              <button className="btn" type="button" onClick={() => setFormOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" disabled={busy}>
                {busy ? 'Saving…' : editingId ? 'Save changes' : 'Create listing'}
              </button>
            </div>
          </form>
        </div>
      )}

      {shoes.length === 0 ? (
        <p className="muted">No listings yet — add one or use bulk upload.</p>
      ) : (
        <div className="card table-card">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Brand</th>
                <th>Model</th>
                <th>Size</th>
                <th>SKU</th>
                <th>Condition</th>
                <th className="num">Asking price</th>
                <th className="num">Admin price</th>
                <th className="num">Qty</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {shoes.map((s) => (
                <tr key={s.id}>
                  <td>{s.id}</td>
                  <td>{s.brand}</td>
                  <td>{s.model}</td>
                  <td>{s.size}</td>
                  <td>{s.sku}</td>
                  <td>{s.condition}</td>
                  <td className="num">{s.askingPrice}</td>
                  <td className="num">{s.adminPrice ?? '—'}</td>
                  <td className="num">{s.qty}</td>
                  <td>
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="row-actions">
                    <button className="btn btn-small" onClick={() => openEdit(s)}>
                      Edit
                    </button>
                    {confirmDeleteId === s.id ? (
                      <button
                        className="btn btn-small btn-danger"
                        onClick={() => handleDelete(s.id)}
                      >
                        Confirm delete?
                      </button>
                    ) : (
                      <button
                        className="btn btn-small"
                        onClick={() => setConfirmDeleteId(s.id)}
                      >
                        Delete
                      </button>
                    )}
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
