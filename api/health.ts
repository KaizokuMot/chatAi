export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  const apiKey = process.env.NVIDIA_API_KEY || process.env.VITE_NVIDIA_API_KEY
  if (!apiKey) {
    res.status(500).json({ status: 'error', message: 'Missing NVIDIA API key' })
    return
  }

  res.status(200).json({ status: 'online', message: 'NVIDIA proxy ready' })
}
