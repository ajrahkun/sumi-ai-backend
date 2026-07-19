export default async function handler(req, res) {
  // 1. Deteksi dari mana request ini berasal
  const origin = req.headers.origin;
  const allowedOrigins = ['https://kageen.my.id', 'http://127.0.0.1:5500', 'http://localhost:5500'];
  
  // 2. Set CORS dinamis (Bisa Localhost, bisa Kageen)
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://kageen.my.id');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Loloskan CORS Preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const targetUrl = req.query.target;
  
  if (!targetUrl || (!targetUrl.includes('.haiakuazra.workers.dev') && !targetUrl.includes('api.kageen.my.id'))) {
     return res.status(403).json({ error: 'Target URL dilarang!' });
  }

  const SECRET_KEY = 'yK7mP2qW9xL4vN1zB6tF3sR8jQ5cX0dY2gH9vK4mP7zB2tF8sN';

  try {
    const fetchResponse = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SECRET_KEY}`,
        'Origin': req.headers.origin || 'https://kageen.my.id',
        'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0'
      }
    });

    const data = await fetchResponse.json();
    return res.status(200).json(data);
    
  } catch (error) {
    return res.status(500).json({ error: 'Gagal menghubungi Worker' });
  }
}
