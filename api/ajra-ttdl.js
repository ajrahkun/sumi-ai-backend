import axios from 'axios';

export const config = {
  runtime: 'nodejs'
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const { url } = req.query;

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Gunakan metode GET.' });
  }

  if (!url) {
    return res.status(400).json({ error: 'Masukkan URL TikTok!' });
  }

  try {
    const params = new URLSearchParams({
      url: url,
      hd: "1"
    });

    const response = await axios.post("https://www.tikwm.com/api/", params.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36"
      },
      timeout: 10000
    });

    const json = response.data;

    return res.status(200).json({
      Status: json.code === 0,
      Code: json.code === 0 ? 200 : json.code,
      ...json
    });
  } catch (err) {
    return res.status(500).json({
      Status: false,
      Code: 500,
      code: 500,
      msg: err.message,
      data: null
    });
  }
}
