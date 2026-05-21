import axios from 'axios';
import FormData from 'form-data';
import crypto from 'node:crypto';

export const config = {
    runtime: 'nodejs'
};

const WINK_BASE = 'https://wink.ai';
const WINK_STRATEGY = 'https://strategy.app.meitudata.com';
const UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36';

function makeWinkTrace() {
    const trace = `${crypto.randomBytes(16).toString('hex')}-${crypto.randomBytes(8).toString('hex')}-1`;
    return {
        'sentry-trace': trace,
        baggage: [
            'sentry-environment=release',
            'sentry-release=5.1.2%20(b60d25c477f43c6dfac4107810f26d442320f4f1)',
            'sentry-public_key=e1bf914f3448d9bc8a10c7e499d17d54',
            `sentry-trace_id=${trace.split('-')[0]}`,
            'sentry-sampled=true',
            'sentry-sample_rate=0.75'
        ].join(',')
    };
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Gunakan metode POST.' });

    const { video_url } = req.body || {};
    if (!video_url) return res.status(400).json({ error: "Mana 'video_url' nya?" });

    try {
        const gnum = crypto.randomUUID();
        const cookieHeader = `_sm=${gnum}; meitustat=${encodeURIComponent(JSON.stringify({ wgid: gnum }))}`;

        const baseHeaders = {
            'accept': '*/*',
            'origin': WINK_BASE,
            'referer': `${WINK_BASE}/video-enhancer/upload`,
            'user-agent': UA,
            'cookie': cookieHeader,
            'sec-ch-ua': '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
            'sec-ch-ua-mobile': '?1',
            'sec-ch-ua-platform': '"Android"',
            'ab_info': JSON.stringify({ ab_codes: [], version: '1.4.4' })
        };

        const baseParams = (extra = {}) => new URLSearchParams({
            client_id: '1189857605',
            version: '5.1.2',
            country_code: 'ID',
            gnum,
            client_language: 'en_US',
            client_channel_id: '',
            client_timezone: 'Asia/Jakarta',
            ...extra
        });

        const resSign = await axios.get(`${WINK_BASE}/api/file/get_maat_sign.json?${baseParams({ suffix: '.mp4', type: 'temp', count: '1' }).toString()}`, {
            headers: { ...baseHeaders, ...makeWinkTrace() },
            validateStatus: () => true
        });
        if (resSign.status >= 400 || resSign.data?.code !== 0) throw new Error('Gagal mengambil Maat Sign');
        const sign = resSign.data.data;

        const policyParams = new URLSearchParams({ app: sign.app, count: String(sign.count), sig: sign.sig, sigTime: sign.sig_time, sigVersion: sign.sig_version, suffix: sign.suffix, type: sign.type });
        const resPolicy = await axios.get(`${WINK_STRATEGY}/upload/policy?${policyParams.toString()}`, {
            headers: { accept: '*/*', origin: WINK_BASE, referer: `${WINK_BASE}/`, 'user-agent': UA },
            validateStatus: () => true
        });
        if (resPolicy.status >= 400 || !resPolicy.data?.[0]?.qiniu) throw new Error('Gagal mengambil Upload Policy');
        const policy = resPolicy.data[0].qiniu;

        const form = new FormData();
        const videoBuffer = await axios.get(video_url, { responseType: 'arraybuffer' });
        const finalBuffer = Buffer.from(videoBuffer.data);
        
        form.append('file', finalBuffer, { filename: 'video.mp4', contentType: 'video/mp4' });
        form.append('token', policy.token);
        form.append('key', policy.key);
        form.append('fname', 'video.mp4');

        const resUpload = await axios.post(policy.url, form, {
            headers: form.getHeaders({ origin: WINK_BASE, referer: `${WINK_BASE}/`, 'user-agent': UA, accept: '*/*' }),
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
            validateStatus: () => true
        });
        if (resUpload.status >= 400) throw new Error('Gagal mengunggah file ke Qiniu via Vercel Proxy');
        
        const uploaded = {
            file_key: policy.key,
            source_url: resUpload.data.url || resUpload.data.data || policy.data
        };

        await axios.post(`${WINK_BASE}/api/file/video_cover_and_display_info_ext.json`, baseParams({ file_key: uploaded.file_key }).toString(), {
            headers: { ...baseHeaders, ...makeWinkTrace(), 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' },
            validateStatus: () => true
        });

        const resTransStart = await axios.post(`${WINK_BASE}/api/file/video_trans_start.json`, baseParams({ file_key: uploaded.file_key }).toString(), {
            headers: { ...baseHeaders, ...makeWinkTrace(), 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' },
            validateStatus: () => true
        });
        if (resTransStart.status >= 400 || resTransStart.data?.code !== 0 || !resTransStart.data?.data?.id) throw new Error('Gagal memulai Transcode');
        const transcodeId = resTransStart.data.data.id;

        const resQuery = await axios.get(`${WINK_BASE}/api/file/video_trans_query.json?${baseParams({ id: transcodeId }).toString()}`, {
            headers: { ...baseHeaders, ...makeWinkTrace() },
            validateStatus: () => true
        });
        const queryData = resQuery.data?.data;
        const videoTranscoded = queryData?.video_transcoded || queryData?.transcoded_video || queryData?.transcoded_url || queryData?.video_url || uploaded.source_url;
        const finalSourceUrl = queryData?.video || queryData?.url || queryData?.source_url || uploaded.source_url;

        const delivBody = baseParams({
            type: '11',
            content_type: '2',
            source_url: finalSourceUrl,
            type_params: JSON.stringify({ is_mirror: 0, orientation_tag: 1, j_420_trans: '1', return_ext: '2' }),
            right_detail: JSON.stringify({ source: '1', touch_type: '4', function_id: '630', material_id: '63011', url: 'https://wink.ai/video-enhancer/upload' }),
            ext_params: JSON.stringify({ task_name: `Enhancer-Ultra HD-${crypto.randomBytes(4).toString('hex')}`, records: '11', video_transcoded: videoTranscoded }),
            with_prepare: '1'
        });

        const resDeliv = await axios.post(`${WINK_BASE}/api/meitu_ai/delivery.json`, delivBody.toString(), {
            headers: { ...baseHeaders, ...makeWinkTrace(), 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' },
            validateStatus: () => true
        });
        if (resDeliv.status >= 400 || resDeliv.data?.code !== 0) throw new Error('Gagal mendaftarkan tugas ke antrean Meitu AI');
        
        const msgId = resDeliv.data.data.msg_id || resDeliv.data.data.prepare_msg_id;

        return res.status(200).json({
            success: true,
            gnum: gnum,
            msg_id: msgId
        });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
