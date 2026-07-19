import axios from 'axios';
import crypto from 'crypto';

export const config = {
    runtime: 'nodejs'
};

const SECRET_KEY = 'yK7mP2qW9xL4vN1zB6tF3sR8jQ5cX0dY2gH9vK4mP7zB2tF8sN';
const IV = Buffer.from([
    10, 20, 30, 40,
    50, 60, 70, 80,
    90, 100, 110, 120,
    130, 140, 150, 160
]);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const auth = req.headers.authorization;

    if (auth !== `Bearer ${SECRET_KEY}`) {
        return res.status(401).json({
            success: false,
            message_owner: 'jangan ditembak atuh mas :)',
            message: 'Unauthorized'
        });
    }

    if (req.method !== 'GET') {
        return res.status(405).json({
            success: false,
            message: 'Gunakan metode GET.'
        });
    }

    const { hashtag } = req.query;

    if (!hashtag) {
        return res.status(400).json({
            success: false,
            message: 'Masukkan nama hashtag!'
        });
    }

    const cleanHashtag = hashtag.replace(/^#/, '');

    try {
        const response = await axios.get(
            `https://www.tikwm.com/api/challenge/info?challenge_name=${encodeURIComponent(cleanHashtag)}`,
            {
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                    'Accept': 'application/json',
                    'Referer': 'https://www.tikwm.com/'
                },
                timeout: 10000
            }
        );

        if (response.data.code !== 0) {
            return res.status(404).json({
                success: false,
                message: response.data.msg || 'Hashtag tidak ditemukan.'
            });
        }

        // Data yang ingin dikirim
        const plainText = JSON.stringify(response.data.data);

        // SHA256(secret)
        const key = crypto
            .createHash('sha256')
            .update(SECRET_KEY)
            .digest();

        // AES-256-CBC
        const cipher = crypto.createCipheriv(
            'aes-256-cbc',
            key,
            IV
        );

        let encrypted = cipher.update(plainText, 'utf8', 'base64');
        encrypted += cipher.final('base64');

        return res.status(200).json({
            success: true,
            ajra: encrypted
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message || 'Gagal mengambil data hashtag.'
        });
    }
}
