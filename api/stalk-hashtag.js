import axios from 'axios';

export const config = {
    runtime: 'nodejs'
};

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    const { challenge_name } = req.query;

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    };

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Gunakan metode GET.' });
    };

    if (!challenge_name) {
        return res.status(400).json({ error: 'Masukkan nama hashtag!' });
    };

    try {
        const response = await axios.get(`https://www.tikwm.com/api/challenge/info?challenge_name=${encodeURIComponent(challenge_name)}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Referer': 'https://www.tikwm.com/',
            },
            timeout: 10000
        });

        if (response.data.code !== 0) {
            return res.status(response.data.code === -1 ? 404 : 400).json({
                error: response.data.msg || 'Challenges not found.'
            })
        };

        return res.status(200).json({
            success: true,
            data: response.data.data
        });
    } catch (err) {
        return res.status(500).json({
            error: err.message || 'Failed to retrieve challenge info.'
        });
    }
};