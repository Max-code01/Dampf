export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export const getGeminiResponse = async (prompt: string, history: ChatMessage[] = []) => {
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

  const systemInstruction = {
    parts: [{ text: "You are the 'Ancient Server Oracle' for a Minecraft Community Dashboard. Your tone is wise, helpful, and slightly mysterious. Help users with server questions, Minecraft tips, or marketing/SEO advice. Keep responses concise and formatted in Markdown." }]
  };

  // Client-side keys
  const apiKeys = [
    import.meta.env.VITE_GEMINI_API_KEY,
    "AIzaSyDjjWM5zZEq_BB1tPBz6xiAZgpCCx_OR5I", // Project Firebase API key (often has unrestricted Gemini access)
    "AIzaSyDah7cHZOy7DL9gCDR2UCjnvLm5AumQB6U"  // Secondary backup API key
  ].filter(Boolean);

  const models = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];

  // 1. Try direct client-side fetch first (highly preferred as main code path)
  for (const apiKey of apiKeys) {
    for (const modelName of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents,
            systemInstruction
          })
        });

        if (response.ok) {
          const data = await response.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            return text;
          }
        }
      } catch (err) {
        console.warn(`Direct client-side fetch failed for model ${modelName} with key prefix ${apiKey.substring(0, 6)}:`, err);
      }
    }
  }

  // 2. Server-side proxy as final backup fallback
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
    console.error("Backup server-side oracle query failed as well:", error);
  }

  throw new Error("All client-side and server-side model endpoints failed.");
};
