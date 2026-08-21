import { useEffect, useState } from 'react'
import { apiFetch } from '../../api'
import { useAuth } from '../../auth'
import StatusBadge from '../../components/StatusBadge'

const STATUSES = ['submitted', 'priced', 'live', 'sold', 'returned']

export default function AdminInventory() {
  const { token } = useAuth()
  const [shoes, setShoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [priceDrafts, setPriceDrafts] = useState({})
  const [busyId, setBusyId] = useState(null)

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

  async function savePrice(shoe) {
    const draft = priceDrafts[shoe.id]
    if (draft === undefined || draft === '') return
    setError('')
    setBusyId(shoe.id)
    try {
      await apiFetch(`/admin/shoes/${shoe.id}/price`, {
        method: 'POST',
        body: { adminPrice: Number(draft) },
        token,
      })
      setPriceDrafts((d) => ({ ...d, [shoe.id]: '' }))
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  async function changeStatus(shoe, status) {
    if (status === shoe.status) return
    setError('')
    setBusyId(shoe.id)
    try {
      await apiFetch(`/admin/shoes/${shoe.id}/status`, {
        method: 'POST',
        body: { status },
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
        <h2>Vendor inventory</h2>
      </div>
      {error && <p className="error">{error}</p>}

      <div className="card table-card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Vendor</th>
              <th>Brand / model</th>
              <th>Size</th>
              <th>SKU</th>
              <th>Condition</th>
              <th className="num">Asking</th>
              <th className="num">Admin price</th>
              <th className="num">Qty</th>
              <th className="num">Sold</th>
              <th>Status</th>
              <th>Set price</th>
              <th>Set status</th>
            </tr>
          </thead>
          <tbody>
            {shoes.map((s) => (
              <tr key={s.id}>
                <td>{s.id}</td>
                <td>
                  {s.vendorName}
                  <div className="muted small">{s.businessName}</div>
                </td>
                <td>
                  {s.brand}
                  <div className="muted small">{s.model}</div>
                </td>
                <td>{s.size}</td>
                <td>{s.sku}</td>
                <td>{s.condition}</td>
                <td className="num">{s.askingPrice}</td>
                <td className="num">{s.adminPrice ?? '—'}</td>
                <td className="num">{s.qty}</td>
                <td className="num">{s.soldQty}</td>
                <td>
                  <StatusBadge status={s.status} />
                </td>
                <td>
                  <div className="inline-input">
                    <input
                      type="number"
                      min="1"
                      step="any"
                      placeholder={s.adminPrice ?? 'price'}
                      value={priceDrafts[s.id] ?? ''}
                      onChange={(e) =>
                        setPriceDrafts((d) => ({ ...d, [s.id]: e.target.value }))
                      }
                    />
                    <button
                      className="btn btn-small"
                      disabled={busyId === s.id || !(priceDrafts[s.id] ?? '')}
                      onClick={() => savePrice(s)}
                    >
                      Save
                    </button>
                  </div>
                </td>
                <td>
                  <select
                    value={s.status}
                    disabled={busyId === s.id}
                    onChange={(e) => changeStatus(s, e.target.value)}
                  >
                    {STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
