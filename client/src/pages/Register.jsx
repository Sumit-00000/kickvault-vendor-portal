import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'

export default function Register() {
  const { user, register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    businessName: '',
    email: '',
    pan: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) {
    const home =
      user.role === 'admin'
        ? '/admin'
        : user.status === 'pending_kyc'
          ? '/vendor/kyc'
          : '/vendor'
    return <Navigate to={home} replace />
  }

  function update(key) {
    return (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await register(form)
      navigate('/vendor/kyc', { replace: true })
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
        <h2 className="auth-subtitle">Vendor registration</h2>
        <form onSubmit={handleSubmit}>
          <label className="field">
            <span>Your name</span>
            <input value={form.name} onChange={update('name')} required />
          </label>
          <label className="field">
            <span>Business name</span>
            <input
              value={form.businessName}
              onChange={update('businessName')}
              required
            />
          </label>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={form.email}
              onChange={update('email')}
              autoComplete="email"
              required
            />
          </label>
          <label className="field">
            <span>PAN</span>
            <input
              value={form.pan}
              onChange={update('pan')}
              placeholder="AAAAA0000A"
              required
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={form.password}
              onChange={update('password')}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p className="auth-alt">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
