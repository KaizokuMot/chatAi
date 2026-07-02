export async function getTherapyResponse(
  messages: Array<{ role: string; content: string }>,
  options?: {
    model?: string
    max_tokens?: number
    temperature?: number
    top_p?: number
  }
) {
  const payload = {
    model: options?.model || localStorage.getItem('modelName') || 'minimaxai/minimax-m3',
    messages,
    max_tokens: options?.max_tokens ?? 4096,
    temperature: options?.temperature ?? 1.0,
    top_p: options?.top_p ?? 0.7,
    stream: false,
  }

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API error: ${response.status} ${errorText}`)
  }

  return response.json()
}

export default {
  getTherapyResponse
}
