// Minimal fetch wrapper for the KickVault API.
// In dev, Vite proxies /api/* to the Express server (see vite.config.js).
export async function apiFetch(
  path,
  { method = 'GET', body, bodyRaw, contentType, token } = {},
) {
  const headers = {}
  if (bodyRaw !== undefined) headers['Content-Type'] = contentType || 'text/plain'
  else if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: bodyRaw !== undefined ? bodyRaw : body !== undefined ? JSON.stringify(body) : undefined,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const error = new Error(data.error || `Request failed (${res.status})`)
    error.status = res.status
    throw error
  }
  return data
}
