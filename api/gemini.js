import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  // CORS setup
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ text: "Method not allowed. Use POST." });
  }

  try {
    // 🧩 Ambil body langsung (tanpa parse lagi)
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ text: "Prompt is required." });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error("❌ Missing GEMINI_API_KEY");
      return res.status(500).json({ text: "Missing API key." });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const result = await model.generateContent(prompt);
    const reply = result?.response?.text() || "(No response)";

    res.status(200).json({ text: reply });
  } catch (err) {
    console.error("❌ Gemini API error:", err);
    res.status(500).json({ text: "Server error while generating response." });
  }
}
