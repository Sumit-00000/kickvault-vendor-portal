import { useEffect, useState } from 'react'
import { apiFetch } from '../../api'
import { useAuth } from '../../auth'
import ChatThread from '../../components/ChatThread'

export default function AdminChat() {
  const { token } = useAuth()
  const [vendors, setVendors] = useState([])
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch('/admin/vendors', { token })
      .then((data) => {
        setVendors(data.vendors)
        if (data.vendors.length > 0) setSelected(data.vendors[0].id)
      })
      .catch((err) => setError(err.message))
  }, [token])

  return (
    <div>
      <div className="page-head">
        <h2>Vendor chat</h2>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="chat-layout">
        <div className="card chat-vendors">
          {vendors.map((v) => (
            <button
              key={v.id}
              className={selected === v.id ? 'chat-vendor chat-vendor-active' : 'chat-vendor'}
              onClick={() => setSelected(v.id)}
            >
              <strong>{v.name}</strong>
              <span className="muted small">{v.businessName}</span>
            </button>
          ))}
        </div>
        <div className="card chat-card">
          {selected ? (
            <ChatThread vendorId={selected} />
          ) : (
            <p className="muted">Select a vendor to open their thread.</p>
          )}
        </div>
      </div>
    </div>
  )
}
