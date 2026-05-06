import { GoogleGenAI } from "@google/genai";

let ai: GoogleGenAI | null = null;

function getAi() {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not defined. AI Oracle will be disabled.");
      return null;
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export const getGeminiResponse = async (prompt: string, history: ChatMessage[] = []) => {
  try {
    const aiInstance = getAi();
    if (!aiInstance) {
      throw new Error("KI-Dienst ist gerade nicht konfiguriert.");
    }
    const response = await aiInstance.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        ...history,
        { role: 'user', parts: [{ text: prompt }] }
      ],
      config: {
        systemInstruction: "You are the 'Ancient Server Oracle' for a Minecraft Community Dashboard. Your tone is wise, helpful, and slightly mysterious. Help users with server questions, Minecraft tips, or marketing/SEO advice. Keep responses concise and formatted in Markdown."
      }
    });

    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
