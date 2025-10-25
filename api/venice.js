import axios from 'axios'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' })
  }

  const { prompt } = req.body || {}
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt tidak boleh kosong.' })
  }

  try {
    const { data } = await axios.request({
      method: 'POST',
      url: 'https://outerface.venice.ai/api/inference/chat',
      headers: {
        accept: '*/*',
        'content-type': 'application/json',
        origin: 'https://venice.ai',
        referer: 'https://venice.ai/',
        'user-agent': 'Mozilla/5.0 (Android 10; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0',
        'x-venice-version': 'interface@20250523.214528+393d253'
      },
      data: JSON.stringify({
        requestId: 'nekorinn',
        modelId: 'dolphin-3.0-mistral-24b',
        prompt: [
          {
            content: prompt,
            role: 'user'
          }
        ],
        systemPrompt: '',
        conversationType: 'text',
        temperature: 0.8,
        webEnabled: true,
        topP: 0.9,
        isCharacter: false,
        clientProcessingTime: 15
      })
    })

    const chunks = data
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(line => {
        try {
          return JSON.parse(line)
        } catch {
          return null
        }
      })
      .filter(Boolean)

    const reply = chunks.map(chunk => chunk.content || '').join('') || '(Tidak ada respons)'

    return res.status(200).json({ reply })
  } catch (err) {
    console.error('Venice proxy error:', err.message)
    return res.status(500).json({ error: err.message || 'Terjadi kesalahan saat memanggil Venice API' })
  }
}
