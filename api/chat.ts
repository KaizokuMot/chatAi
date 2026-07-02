export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  const apiKey = process.env.NVIDIA_API_KEY || process.env.VITE_NVIDIA_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'Missing NVIDIA API key' })
    return
  }

  let payload: any
  try {
    payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  } catch (error) {
    res.status(400).json({ error: 'Invalid JSON payload' })
    return
  }

  try {
    const nvidiaResponse = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        model: payload.model || 'minimaxai/minimax-m3',
        messages: payload.messages || [],
        max_tokens: payload.max_tokens ?? 4096,
        temperature: payload.temperature ?? 1.0,
        top_p: payload.top_p ?? 0.7,
        stream: false
      })
    })

    const text = await nvidiaResponse.text()
    res.status(nvidiaResponse.status)
    res.setHeader('Content-Type', nvidiaResponse.headers.get('content-type') || 'application/json')
    res.send(text)
  } catch (error: any) {
    console.error('Chat proxy error:', error)
    res.status(500).json({ error: error?.message || 'Proxy error' })
  }
}
