import axios from 'axios';

export default async function handler(req, res) {
  // ===== CORS Fix =====
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }
  // ====================

  const { prompt } = req.body || {};
  if (!prompt) return res.status(400).json({ error: 'Prompt tidak boleh kosong.' });

  try {
    const { data } = await axios.post(
      'https://us-central1-openaiprojects-1fba2.cloudfunctions.net/chat_gpt_ai/api.live.text.gen',
      {
        model: 'gpt-4o-mini',
        temperature: 0.2,
        top_p: 0.2,
        prompt
      },
      {
        headers: {
          'content-type': 'application/json; charset=UTF-8'
        }
      }
    );

    const reply = data?.choices?.[0]?.message?.content || '(Tidak ada respons)';
    return res.status(200).json({ reply });
  } catch (err) {
    console.error('GPT proxy error:', err.message);
    return res.status(500).json({ error: err.message || 'Terjadi kesalahan saat memanggil GPT API' });
  }
}
