import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'

const readRequestBody = async (req: IncomingMessage) => {
  return new Promise<string>((resolve, reject) => {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

const createNvidiaProxyPlugin = (apiKey: string | undefined): Plugin => {
  const handleProxy = async (req: IncomingMessage, res: ServerResponse, next: (err?: any) => void) => {
    if (!req.url) return next()
    const url = req.url.split('?')[0]

    if (url === '/api/chat' && req.method === 'POST') {
      if (!apiKey) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'Missing NVIDIA API key in VITE_NVIDIA_API_KEY' }))
        return
      }

      try {
        const bodyText = await readRequestBody(req)
        const payload = bodyText ? JSON.parse(bodyText) : {}

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
            stream: false,
          })
        })

        const responseText = await nvidiaResponse.text()
        res.statusCode = nvidiaResponse.status
        res.setHeader('Content-Type', nvidiaResponse.headers.get('content-type') || 'application/json')
        res.end(responseText)
      } catch (error: any) {
        console.error('NVIDIA proxy error:', error)
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: error?.message || 'Proxy request failed' }))
      }

      return
    }

    if (url === '/api/health' && req.method === 'GET') {
      if (!apiKey) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ status: 'error', message: 'Missing NVIDIA API key in VITE_NVIDIA_API_KEY' }))
        return
      }

      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ status: 'online', message: 'NVIDIA proxy ready' }))
      return
    }

    return next()
  }

  return {
    name: 'vite:nvidia-backend-proxy',
    configureServer(server) {
      server.middlewares.use(handleProxy)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handleProxy)
    }
  }
}

export default ({ mode }: { mode: string }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return defineConfig({
    plugins: [react(), createNvidiaProxyPlugin(env.VITE_NVIDIA_API_KEY)]
  })
}
