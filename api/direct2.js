import axios from 'axios';
import crypto from 'crypto';

export const config = {
    runtime: 'nodejs'
};

const SECRET_KEY = 'A5qW8mE2vK9pX4zN1tF7bH3sY6dQ0cG2jJ9mL5zP8kF4xT';
const IV = Buffer.from([
    10, 20, 30, 40,
    50, 60, 70, 80,
    90, 100, 110, 120,
    130, 140, 150, 160
]);

export default async function handler(req, res) {
    const origin = req.headers.origin;
    const allowedOrigins = ['https://kageen.my.id', 'http://127.0.0.1:5500', 'http://localhost:5500'];

    if (!origin || !allowedOrigins.includes(origin)) {
        return res.status(403).json({
            success: false,
            message: 'Access Denied'
        })
    };

    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    };

    if (req.method !== 'GET') {
        return res.status(405).json({
            success: false,
            message: 'Use the GET method.'
        })
    };

    const { query } = req.query;

    if (!query) {
        return res.status(400).json({
            success: false,
            message: 'Input Query!'
        })
    };

    const cleanHashtag = query.replace(/^#/, '');

    try {
        const response = await axios.get(`https://www.tikwm.com/api/challenge/info?challenge_name=${encodeURIComponent(cleanHashtag)}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'application/json',
                'Referer': 'https://www.tikwm.com/'
            },
            timeout: 10000
        });

        if (response.data.code !== 0) {
            return res.status(404).json({
                success: false,
                message: response.data.msg || 'Not Found.'
            })
        };

        const plainText = JSON.stringify(response.data.data);

        const key = crypto.createHash('sha256').update(SECRET_KEY).digest();
        const cipher = crypto.createCipheriv('aes-256-cbc', key, IV);

        let encrypted = cipher.update(plainText, 'utf8', 'base64');
        encrypted += cipher.final('base64');

        return res.status(200).json({
            success: true,
            result: encrypted
        })
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }
};
