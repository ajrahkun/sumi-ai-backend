const axios = require('axios');

export default async function handler(req, res) {
  // ===== CORS Fix =====
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }
  // ====================

  const { prompt } = req.body || {};
  if (!prompt) return res.status(400).json({ error: 'Prompt tidak boleh kosong.' });

  try {
    // build request payload using the pattern you provided
    const payload = {
      user_id: "guest_df14885919c34ec19fc50a7de76d50c8",
      user_level: "free",
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: prompt // gunakan prompt yang dikirim user
        }
      ],
      prompt: prompt,
      temperature: 0.7,
      enableWebSearch: false,
      usedVoiceInput: false
    };

    const config = {
      method: 'POST',
      url: 'https://chat.hackaigc.com/api/chat',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Content-Type': 'application/json',
        'sec-ch-ua-platform': '"Android"',
        'authorization': 'Bearer anonymous_guest_df14885919c34ec19fc50a7de76d50c8',
        'sec-ch-ua': '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
        'dnt': '1',
        'sec-ch-ua-mobile': '?1',
        'origin': 'https://chat.hackaigc.com',
        'sec-fetch-site': 'same-origin',
        'sec-fetch-mode': 'cors',
        'sec-fetch-dest': 'empty',
        'referer': 'https://chat.hackaigc.com/',
        'accept-language': 'id,en-US;q=0.9,en;q=0.8,ja;q=0.7',
        'priority': 'u=1, i'
      },
      data: JSON.stringify(payload),
      timeout: 20000 // opsional: timeout 20s
    };

    const response = await axios.request(config);
    // return seluruh response data dari endpoint pihak ketiga
    return res.status(200).json({ data: response.data });
  } catch (err) {
    console.error('GPT proxy error:', err?.response?.data || err.message || err);
    const message = err?.response?.data || err.message || 'Terjadi kesalahan saat memanggil endpoint';
    return res.status(500).json({ error: message });
  }
}
