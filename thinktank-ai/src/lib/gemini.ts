import { GoogleGenAI } from "@google/genai";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

let client: GoogleGenAI | null = null;

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

function getClient(): GoogleGenAI {
  if (!client) {
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return client;
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
  latestStudentMessage: string
): Promise<string> {
  const ai = getClient();

  const contents = [
    ...history.map((turn) => ({
      role: turn.role === "student" ? "user" : "model",
      parts: [{ text: turn.text }],
    })),
    { role: "user", parts: [{ text: latestStudentMessage }] },
  ];

  const response = await ai.models.generateContent({
    model: MODEL,
    contents,
    config: {
      systemInstruction,
      temperature: 0.8,
      maxOutputTokens: 2048,
    },
  });

  const text = response.text;
  if (!text) throw new Error("Empty response from Gemini");
  return text.trim();
}

/**
 * Calls Gemini asking for a strict JSON object back (for evaluations,
 * mistake analysis, debate generation, scoring, etc.). Strips markdown
 * fences defensively and throws if parsing fails so the caller can
 * fall back to a mock.
 */
export async function generateJSON<T>(
  systemInstruction: string,
  userPrompt: string
): Promise<T> {
  const ai = getClient();

  const response = await ai.models.generateContent({
    model: MODEL,
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
}
