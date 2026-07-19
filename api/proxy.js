export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://kageen.my.id');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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
        'User-Agent': 'Kagenou-Vercel-Proxy'
      }
    });

    const data = await fetchResponse.json();
    return res.status(200).json(data);
    
  } catch (error) {
    return res.status(500).json({ error: 'Gagal menghubungi Worker' });
  }
}
