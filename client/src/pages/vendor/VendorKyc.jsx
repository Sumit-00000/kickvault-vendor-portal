import { useState } from 'react'
import { apiFetch } from '../../api'
import { useAuth } from '../../auth'

export default function VendorKyc() {
  const { user, token, setCurrentUser } = useAuth()
  const [pan, setPan] = useState(user.pan || '')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setResult(null)
    setBusy(true)
    try {
      const data = await apiFetch('/kyc/verify', {
        method: 'POST',
        body: { pan },
        token,
      })
      setResult({ verified: data.verified })
      setCurrentUser(data.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page-narrow">
      <h2>KYC verification</h2>
      <p className="muted">
        Account status: <span className="badge">{user.status}</span>
      </p>

      {user.status === 'active' ? (
        <div className="card">
          <p className="success">
            ✓ KYC verified — your account is active.
          </p>
        </div>
      ) : (
        <div className="card">
          <p>
            Submit your PAN to verify your account. This is a mock KYC check —
            no external provider is involved.
          </p>
          <form onSubmit={handleSubmit}>
            <label className="field">
              <span>PAN</span>
              <input
                value={pan}
                onChange={(e) => setPan(e.target.value)}
                placeholder="AAAAA0000A"
                required
              />
            </label>
            {result && !result.verified && (
              <p className="error">
                Verification failed — the PAN was not accepted. Check the value
                and try again.
              </p>
            )}
            {error && <p className="error">{error}</p>}
            <button className="btn btn-primary" disabled={busy}>
              {busy ? 'Verifying…' : 'Verify'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
