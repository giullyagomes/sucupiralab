const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api'

export async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_URL}${url}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(error || 'Erro inesperado')
  }

  return response.json()
}