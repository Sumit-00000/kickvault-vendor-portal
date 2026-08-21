import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '../api'
import { useAuth } from '../auth'

const POLL_MS = 5000

export default function ChatThread({ vendorId }) {
  const { user, token } = useAuth()
  const [messages, setMessages] = useState(null)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const bottomRef = useRef(null)
  const countRef = useRef(0)

  useEffect(() => {
    let cancelled = false

    async function poll() {
      try {
        const data = await apiFetch(`/chat/${vendorId}/messages`, { token })
        if (!cancelled) setMessages(data.messages)
      } catch (err) {
        if (!cancelled) setError(err.message)
      }
    }

    setMessages(null)
    poll()
    const timer = setInterval(poll, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [vendorId, token])

  useEffect(() => {
    if (messages && messages.length > countRef.current) {
      bottomRef.current?.scrollIntoView({ block: 'nearest' })
    }
    countRef.current = messages ? messages.length : 0
  }, [messages])

  async function handleSend(e) {
    e.preventDefault()
    if (!draft.trim()) return
    setError('')
    setBusy(true)
    try {
      const data = await apiFetch(`/chat/${vendorId}/messages`, {
        method: 'POST',
        body: { body: draft },
        token,
      })
      setMessages((list) => [...(list || []), data.message])
      setDraft('')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!messages) return <p className="page-loading">Loading…</p>

  return (
    <div className="chat">
      <div className="chat-messages">
        {messages.length === 0 && (
          <p className="muted chat-empty">No messages yet — start the conversation.</p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={m.senderId === user.id ? 'chat-msg chat-msg-own' : 'chat-msg'}
          >
            <div className="chat-meta">
              {m.senderName} · {m.senderRole} · {m.createdAt}
            </div>
            <div className="chat-bubble">{m.body}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      {error && <p className="error">{error}</p>}
      <form className="chat-form" onSubmit={handleSend}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          maxLength={2000}
        />
        <button className="btn btn-primary" disabled={busy || !draft.trim()}>
          Send
        </button>
      </form>
    </div>
  )
}
