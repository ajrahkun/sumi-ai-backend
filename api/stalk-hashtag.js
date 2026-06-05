import axios from 'axios';

export const config = {
    runtime: 'nodejs'
};

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    const { hashtag } = req.query;

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    };

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Gunakan metode GET.' });
    };

    if (!hashtag) {
        return res.status(400).json({ error: 'Masukkan nama hashtag!' });
    };

    const cleanHashtag = hashtag.replace(/^#/, '');

    try {
        const response = await axios.get(`https://www.tikwm.com/api/challenge/info?challenge_name=${encodeURIComponent(cleanHashtag)}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Referer': 'https://www.tikwm.com/',
            },
            timeout: 10000
        });

        if (response.data.code !== 0) {
            return res.status(404).json({
                error: response.data.msg || 'Hashtag tidak ditemukan.'
            })
        };

        return res.status(200).json({
            success: true,
            data: response.data.data
        });
    } catch (err) {
        return res.status(500).json({
            error: err.message || 'Gagal mengambil data hashtag.'
        });
    }
};
