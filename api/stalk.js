import axios from "axios";
import cheerio from "cheerio";

export const config = {
  runtime: "nodejs"
};

export default async function handler(req, res) {

  // ===== CORS =====
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Gunakan method GET." });
  }

  const { user } = req.query;

  if (!user) {
    return res.status(400).json({ error: "Masukkan username akun!" });
  }

  const username = user.replace(/^@/, "");
  const targetUrl = `https://www.tiktok.com/@${encodeURIComponent(username)}`;

  try {
    const { data } = await axios.get(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Referer: "https://www.tiktok.com/"
      },
      timeout: 15000
    });

    const $ = cheerio.load(data);
    const jsonText = $("#__UNIVERSAL_DATA_FOR_REHYDRATION__").text();

    if (!jsonText) {
      return res.status(500).json({
        error: "Terkena captcha / TikTok memblokir request."
      });
    }

    const parsed = JSON.parse(jsonText);
    const detail = parsed?.__DEFAULT_SCOPE__?.["webapp.user-detail"];

    if (!detail || detail.statusCode !== 0) {
      return res.status(404).json({
        error: "Akun tidak ditemukan atau struktur berubah."
      });
    }

    return res.status(200).json({
      success: true,
      user: detail.userInfo.user,
      stats: detail.userInfo.stats
    });

  } catch (err) {
    return res.status(500).json({
      error: err.message
    });
  }
}
