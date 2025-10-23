import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ text: "Method not allowed. Use POST." });
  };

  try {
    const { prompt } = await req.json?.() || await new Response(req.body).json();

    if (!prompt) {
      return res.status(400).json({ text: "Prompt is required." });
    };

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const result = await model.generateContent(prompt);
    const reply = result.response.text();

    return res.status(200).json({ text: reply });
  } catch (err) {
    console.error("Gemini API error:", err);
    return res.status(500).json({ text: "Server error while generating response." });
  }
};
