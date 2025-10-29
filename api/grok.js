import axios from 'axios';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed. Use POST.' });

  const { prompt } = req.body || {};
  if (!prompt) return res.status(400).json({ error: 'Prompt tidak boleh kosong.' });

  try {
    const payload = {
      user_id: "guest_df14885919c34ec19fc50a7de76d50c8",
      user_level: "free",
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      prompt,
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
      timeout: 20000
    };

    const response = await axios.request(config);
    const resp = response.data;

    if (typeof resp === 'string' && resp.includes('data:')) {
      let finalReply = '';
      const lines = resp.split(/\r?\n/);
      for (let line of lines) {
        if (!line.startsWith('data:')) continue;
        const payload = line.replace(/^data:\s*/, '').trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          const parsed = JSON.parse(payload);
          if (parsed.content) finalReply += parsed.content;
          else if (Array.isArray(parsed.choices)) {
            for (const c of parsed.choices) {
              if (c.delta?.content) finalReply += c.delta.content;
              else if (c.text) finalReply += c.text;
              else if (c.message?.content) finalReply += c.message.content;
            }
          } else {
            for (const key in parsed) {
              if (typeof parsed[key] === 'string') finalReply += parsed[key];
            }
          }
        } catch {}
      }
      return res.status(200).json({ reply: finalReply || 'AI tidak merespon (stream kosong).' });
    }

    if (typeof resp === 'object') {
      let reply = resp.reply || resp.text || resp.message || '';
      if (!reply && Array.isArray(resp.choices)) {
        reply = resp.choices.map(c => c.text || c.message?.content || (c.delta?.content || '')).join('');
      }
      if (!reply) {
        try { reply = JSON.stringify(resp); } catch { reply = String(resp); }
      }
      return res.status(200).json({ reply });
    }

    return res.status(200).json({ reply: String(resp) });
  } catch (err) {
    console.error('Grok API error:', err.message, err.response?.data);
    const message = err.response?.data || err.message || 'Terjadi kesalahan di server.';
    return res.status(500).json({ error: message });
  }
}
