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

    const { url } = req.query;

    if (!url) {
        return res.status(400).json({
            success: false,
            message: 'Masukkan URL TikTok!'
        });
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

        if (json.code !== 0) {
            return res.status(404).json({
                success: false,
                message: json.msg || 'Gagal mengambil data video.'
            });
        }

        const plainText = JSON.stringify({
            Status: true,
            Code: 200,
            ...json
        });

        const key = crypto
            .createHash('sha256')
            .update(SECRET_KEY)
            .digest();

        const cipher = crypto.createCipheriv(
            'aes-256-cbc',
            key,
            IV
        );

        let encrypted = cipher.update(plainText, 'utf8', 'base64');
        encrypted += cipher.final('base64');

        return res.status(200).json({
            success: true,
            result: encrypted
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message || 'Gagal merespons server.'
        });
    }
}
