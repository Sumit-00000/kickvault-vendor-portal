import { createContext, useContext, useEffect, useState } from 'react'
import { apiFetch } from './api'

const AuthContext = createContext(null)

const TOKEN_KEY = 'kickvault_token'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(() => !!localStorage.getItem(TOKEN_KEY))

  // Restore the session from a stored token on page load. Skipped when the
  // user is already in state (e.g. right after login). The token is only
  // discarded on a real 401 — transient network failures don't log users out.
  useEffect(() => {
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }
    if (user) {
      setLoading(false)
      return
    }
    let cancelled = false
    apiFetch('/me', { token })
      .then((data) => {
        if (!cancelled) setUser(data.user)
      })
      .catch((err) => {
        if (!cancelled && err.status === 401) {
          localStorage.removeItem(TOKEN_KEY)
          setToken(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token, user])

  async function login(role, email, password) {
    const data = await apiFetch(`/auth/${role}/login`, {
      method: 'POST',
      body: { email, password },
    })
    localStorage.setItem(TOKEN_KEY, data.token)
    setUser(data.user)
    setToken(data.token)
    return data.user
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
  }

  function setCurrentUser(u) {
    setUser(u)
  }

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout, setCurrentUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
