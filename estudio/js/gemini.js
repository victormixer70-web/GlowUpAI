// Cliente mínimo de la API de Google Gemini (REST), usado directamente desde el navegador.

const BASE = "https://generativelanguage.googleapis.com/v1beta";

export const DEFAULT_MODEL = "gemini-3.6-flash";

export class GeminiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function headers(apiKey) {
  return { "Content-Type": "application/json", "x-goog-api-key": apiKey };
}

async function toError(res) {
  let detail = "";
  try {
    const body = await res.json();
    detail = body?.error?.message || "";
  } catch {
    /* sin cuerpo */
  }
  if (res.status === 400 && /api key/i.test(detail)) {
    return new GeminiError("La clave de API no es válida. Revísala en Ajustes.", 400);
  }
  if (res.status === 403) return new GeminiError("Tu clave no tiene permiso para usar este modelo. Revísala en Ajustes.", 403);
  if (res.status === 404) return new GeminiError("Ese modelo ya no existe. Elige otro en Ajustes.", 404);
  if (res.status === 429) return new GeminiError("Has llegado al límite de uso de tu clave. Espera un poco y vuelve a intentarlo.", 429);
  if (res.status >= 500) return new GeminiError("Gemini no responde ahora mismo. Inténtalo de nuevo en un momento.", res.status);
  return new GeminiError(detail || `Error ${res.status}`, res.status);
}

// Devuelve los modelos de texto disponibles para la clave, los más nuevos primero.
export async function listModels(apiKey) {
  const res = await fetch(`${BASE}/models?pageSize=200`, { headers: headers(apiKey) });
  if (!res.ok) throw await toError(res);
  const body = await res.json();
  const skip = /embedding|image|tts|audio|live|vision|aqa|robotics|computer|learnlm|gemma|nano/i;
  const models = (body.models || [])
    .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
    .map((m) => ({ id: m.name.replace(/^models\//, ""), label: m.displayName || m.name }))
    .filter((m) => m.id.startsWith("gemini") && !skip.test(m.id));
  const version = (id) => parseFloat((id.match(/gemini-(\d+(?:\.\d+)?)/) || [])[1] || "0");
  models.sort((a, b) => version(b.id) - version(a.id) || a.id.localeCompare(b.id));
  return models;
}

// Elige un buen modelo por defecto: el Flash estable más nuevo.
export function pickDefaultModel(models) {
  const ids = models.map((m) => m.id);
  if (ids.includes(DEFAULT_MODEL)) return DEFAULT_MODEL;
  const stableFlash = ids.find((id) => /-flash$/.test(id));
  return stableFlash || ids.find((id) => /flash/.test(id) && !/lite/.test(id)) || ids[0] || DEFAULT_MODEL;
}

function textFrom(body) {
  const parts = body?.candidates?.[0]?.content?.parts || [];
  return parts
    .filter((p) => !p.thought && typeof p.text === "string")
    .map((p) => p.text)
    .join("");
}

function blockedReason(body) {
  const fb = body?.promptFeedback?.blockReason;
  if (fb) return "Gemini bloqueó la petición por sus filtros de seguridad.";
  const finish = body?.candidates?.[0]?.finishReason;
  if (finish === "SAFETY") return "Gemini cortó la respuesta por sus filtros de seguridad.";
  return null;
}

// Petición normal que debe devolver JSON.
export async function generateJSON({ apiKey, model, system, prompt }) {
  const res = await fetch(`${BASE}/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: headers(apiKey),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });
  if (!res.ok) throw await toError(res);
  const body = await res.json();
  const blocked = blockedReason(body);
  if (blocked) throw new GeminiError(blocked);
  const text = textFrom(body).trim();
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new GeminiError("La respuesta de Gemini no tenía el formato esperado. Vuelve a intentarlo.");
  }
}

// Chat con respuesta en streaming. `history` es [{ role: "user"|"model", parts: [...] }].
// Llama a onText(textoAcumulado) a medida que llega la respuesta y devuelve el texto final.
export async function streamChat({ apiKey, model, system, history, onText, signal }) {
  const res = await fetch(`${BASE}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`, {
    method: "POST",
    headers: headers(apiKey),
    signal,
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: history,
    }),
  });
  if (!res.ok) throw await toError(res);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  let blocked = null;

  const handleEvent = (raw) => {
    const data = raw
      .split("\n")
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.slice(5).trim())
      .join("");
    if (!data) return;
    let body;
    try {
      body = JSON.parse(data);
    } catch {
      return;
    }
    blocked = blockedReason(body) || blocked;
    const chunk = textFrom(body);
    if (chunk) {
      full += chunk;
      onText(full);
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
    let idx;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      handleEvent(buffer.slice(0, idx));
      buffer = buffer.slice(idx + 2);
    }
  }
  if (buffer.trim()) handleEvent(buffer);
  if (!full && blocked) throw new GeminiError(blocked);
  if (!full) throw new GeminiError("Gemini no devolvió ninguna respuesta. Vuelve a intentarlo.");
  return full;
}
