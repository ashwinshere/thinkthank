export async function callAI<T = any>(action: string, payload: any): Promise<T> {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
  });
  if (!res.ok) {
    throw new Error(`AI call failed: ${res.status}`);
  }
  return res.json();
}
