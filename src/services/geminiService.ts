export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export const getGeminiResponse = async (prompt: string, history: ChatMessage[] = []) => {
  // Try server proxy first (hides key, preferred)
  try {
    const response = await fetch("/api/oracle", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt, history }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.text && !data.text.includes("GEMINI_API_KEY ist für den Online-Betrieb nicht konfiguriert")) {
        return data.text;
      }
    }
  } catch (error) {
    console.warn("Server-side oracle failed, trying client-side fallback:", error);
  }

  // Client-side direct fallback using the user's Gemini key to guarantee it works 100% online
  try {
    const apiKey = "AIzaSyDah7cHZOy7DL9gCDR2UCjnvLm5AumQB6U";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    // Format contents for official gemini API
    const contents = [
      ...history.map(h => ({
        role: h.role === 'model' ? 'model' : 'user',
        parts: h.parts.map(p => ({ text: p.text }))
      })),
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ];

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [{ text: "You are the 'Ancient Server Oracle' for a Minecraft Community Dashboard. Your tone is wise, helpful, and slightly mysterious. Help users with server questions, Minecraft tips, or marketing/SEO advice. Keep responses concise and formatted in Markdown." }]
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Client-side Gemini API responded with ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Das Orakel ist gerade verstummt...";
  } catch (clientError) {
    console.error("Client-side fallback also failed:", clientError);
    throw clientError;
  }
};
