import axios from 'axios';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  // === CORS ===
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    // === Ambil buffer image ===
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: "Image (base64) tidak boleh kosong." });
    }

    // Decode base64 → buffer
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // Random filename
    const fileName = Math.random().toString(36).slice(2, 8) + ".jpg";

    // Temporary cache folder (Vercel readonly, tapi masih bisa untuk memori)
    const cachePath = "/tmp/" + fileName;
    fs.writeFileSync(cachePath, buffer);

    // === STEP 1: Request Signed URL ===
    const { data: signed } = await axios.post(
      "https://pxpic.com/getSignedUrl",
      {
        folder: "uploads",
        fileName,
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    // === STEP 2: Upload ke presigned URL ===
    await axios.put(signed.presignedUrl, buffer, {
      headers: { "Content-Type": "image/jpeg" },
    });

    const fileUrl = "https://files.fotoenhancer.com/uploads/" + fileName;

    // === STEP 3: Call AI Upscale ===
    const aiRequest = new URLSearchParams({
      imageUrl: fileUrl,
      targetFormat: "png",
      needCompress: "no",
      imageQuality: "100",
      compressLevel: "6",
      fileOriginalExtension: "png",
      aiFunction: "upscale",
      upscalingLevel: "",
    }).toString();

    const { data: api } = await axios.post(
      "https://pxpic.com/callAiFunction",
      aiRequest,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Android 10; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0",
          Accept: "*/*",
          "Content-Type": "application/x-www-form-urlencoded",
          "accept-language": "id-ID",
        },
      }
    );

    if (!api?.resultImageUrl) {
      return res.status(500).json({ error: "Upscale gagal, coba lagi." });
    }

    // === STEP 4: Download hasil & hitung size/resolusi ===
    const upscaleBuffer = await axios
      .get(api.resultImageUrl, { responseType: "arraybuffer" })
      .then((res) => res.data);

    const sizeKB = (upscaleBuffer.length / 1024).toFixed(2);
    const sizeMB = (upscaleBuffer.length / 1024 / 1024).toFixed(2);

    return res.status(200).json({
      result: api.resultImageUrl,
      sizeKB,
      sizeMB,
      fileUrl,
    });
  } catch (err) {
    console.error("Upscale API error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
