import { GoogleGenAI } from "@google/genai";

// Initialization with the platform-provided key
const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY as string 
});

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export const getGeminiResponse = async (prompt: string, history: ChatMessage[] = []) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        ...history,
        { role: 'user', parts: [{ text: prompt }] }
      ],
      config: {
        systemInstruction: "You are the 'Ancient Server Oracle' for a Minecraft Community Dashboard. Your tone is wise, helpful, and slightly mysterious (like a Minecraft villager or a wizard). You have access to real-time information via Google Search. Help users with server questions, Minecraft tips, or marketing/SEO advice for their projects. Keep responses concise and formatted in Markdown.",
        tools: [{ googleSearch: {} }]
      }
    });

    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
