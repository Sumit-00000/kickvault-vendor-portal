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

export async function apiDownload(path, token, filename) {
  const res = await fetch(`/api${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `Download failed (${res.status})`)
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
