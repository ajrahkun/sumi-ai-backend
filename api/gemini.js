import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ text: "Method not allowed. Use POST." });
  }

  try {
    const body = await req.json?.() || await new Response(req.body).json();
    const { prompt } = body;

    if (!prompt) {
      return res.status(400).json({ text: "Prompt is required." });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);

    res.status(200).json({ text: result.response.text() });
  } catch (error) {
    console.error("Gemini API error:", error);
    res.status(500).json({ text: "Server error while generating response." });
  }
}
