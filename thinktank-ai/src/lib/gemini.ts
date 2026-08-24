import { GoogleGenAI } from "@google/genai";

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export function isGeminiConfigured(customKey?: string): boolean {
  return Boolean(customKey || process.env.GEMINI_API_KEY);
}

function getClient(customKey?: string): GoogleGenAI {
  const key = customKey || process.env.GEMINI_API_KEY;
  if (!key) throw new Error("No Gemini API key available");
  return new GoogleGenAI({ apiKey: key });
}

export interface TurnInput {
  role: "student" | "peer";
  text: string;
}

/**
 * Calls Gemini with a persona system instruction plus a lightweight
 * conversation history. Returns plain text.
 */
export async function generatePeerReply(
  systemInstruction: string,
  history: TurnInput[],
  latestStudentMessage: string,
  customApiKey?: string
): Promise<string> {
  const ai = getClient(customApiKey);

  const contents = [
    ...history.map((turn) => ({
      role: turn.role === "student" ? "user" : "model",
      parts: [{ text: turn.text }],
    })),
    { role: "user", parts: [{ text: latestStudentMessage }] },
  ];

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from Gemini");
    return text.trim();
  } catch (err: any) {
    // If 2.5-flash fails with not found, fallback to 1.5-flash
    if (err?.message?.includes("not found") || err?.status === 404) {
      const fallbackResponse = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      });
      const text = fallbackResponse.text;
      if (text) return text.trim();
    }
    throw err;
  }
}

/**
 * Calls Gemini asking for a strict JSON object back (for evaluations,
 * mistake analysis, debate generation, scoring, etc.). Strips markdown
 * fences defensively and throws if parsing fails so the caller can
 * fall back to a mock.
 */
export async function generateJSON<T>(
  systemInstruction: string,
  userPrompt: string,
  customApiKey?: string
): Promise<T> {
  const ai = getClient(customApiKey);

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      config: {
        systemInstruction: `${systemInstruction}\n\nRespond with ONLY a valid JSON object. No markdown fences, no preamble, no commentary.`,
        temperature: 0.6,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from Gemini");

    const cleaned = text.trim().replace(/^```json\s*|^```\s*|```$/g, "");
    return JSON.parse(cleaned) as T;
  } catch (err: any) {
    // Fallback to gemini-1.5-flash if needed
    if (err?.message?.includes("not found") || err?.status === 404) {
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        config: {
          systemInstruction: `${systemInstruction}\n\nRespond with ONLY a valid JSON object. No markdown fences, no preamble, no commentary.`,
          temperature: 0.6,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
        },
      });
      const text = response.text;
      if (!text) throw new Error("Empty response from Gemini fallback");
      const cleaned = text.trim().replace(/^```json\s*|^```\s*|```$/g, "");
      return JSON.parse(cleaned) as T;
    }
    throw err;
  }
}

export async function testConnection(customApiKey?: string): Promise<{ ok: boolean; model: string; error?: string }> {
  try {
    const ai = getClient(customApiKey);
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: [{ role: "user", parts: [{ text: "Say 'ThinkTank Live'" }] }],
    });
    return { ok: true, model: DEFAULT_MODEL };
  } catch (err: any) {
    return { ok: false, model: DEFAULT_MODEL, error: err?.message || String(err) };
  }
}

