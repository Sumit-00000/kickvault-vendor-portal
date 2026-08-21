import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '../api'
import { useAuth } from '../auth'

const POLL_MS = 15000

export default function NotificationsBell() {
  const { token } = useAuth()
  const [items, setItems] = useState([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    async function poll() {
      try {
        const data = await apiFetch('/notifications', { token })
        if (!cancelled) {
          setItems(data.notifications)
          setUnread(data.unread)
        }
      } catch {
        /* ignore polling errors */
      }
    }

    poll()
    const timer = setInterval(poll, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [token])

  useEffect(() => {
    if (!open) return
    function onClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  async function toggle() {
    const next = !open
    setOpen(next)
    if (next && unread > 0) {
      try {
        await apiFetch('/notifications/read', { method: 'POST', token })
        setUnread(0)
        setItems((list) => list.map((n) => ({ ...n, read: 1 })))
      } catch {
        /* ignore */
      }
    }
  }

  return (
    <div className="notif-wrap" ref={wrapRef}>
      <button className="btn btn-small notif-btn" onClick={toggle} title="Notifications">
        🔔
        {unread > 0 && <span className="notif-count">{unread}</span>}
      </button>
      {open && (
        <div className="card notif-panel">
          <h4>Notifications</h4>
          {items.length === 0 ? (
            <p className="muted small">Nothing yet.</p>
          ) : (
            <ul className="notif-list">
              {items.map((n) => (
                <li key={n.id} className={n.read ? 'notif-item' : 'notif-item notif-unread'}>
                  <span>{n.message}</span>
                  <span className="notif-time">{n.createdAt}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
