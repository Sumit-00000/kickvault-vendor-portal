import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [role, setRole] = useState('vendor')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/vendor'} replace />
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const u = await login(role, email, password)
      navigate(u.role === 'admin' ? '/admin' : '/vendor', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <h1 className="brand">
          KickVault <span className="brand-sub">Vendor Portal</span>
        </h1>
        <div className="tabs" role="tablist">
          <button
            type="button"
            className={role === 'vendor' ? 'tab tab-active' : 'tab'}
            onClick={() => setRole('vendor')}
          >
            Vendor
          </button>
          <button
            type="button"
            className={role === 'admin' ? 'tab tab-active' : 'tab'}
            onClick={() => setRole('admin')}
          >
            Admin
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Signing in…' : `Sign in as ${role}`}
          </button>
        </form>
      </div>
    </div>
  )
}
