import type { IncomingMessage, ServerResponse } from "node:http";

type ApiRequest = IncomingMessage & { body?: any; method?: string };
type ApiResponse = ServerResponse & { status(code: number): ApiResponse };
type GeminiPart = { text?: string };
type GeminiResponse = {
  error?: { message?: string };
  candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
};

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 8;
const requestCounts = new Map();

function reply(res: ApiResponse, statusCode: number, payload: unknown): void {
  res.status(statusCode).setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method === "OPTIONS") {
    res.status(204).setHeader("Allow", "POST, OPTIONS").end();
    return;
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    reply(res, 405, { ok: false, error: "Method not allowed." });
    return;
  }

  const key = process.env.DEVELOPER_STUDIO_GEMINI_API_KEY;
  const model = process.env.DEVELOPER_STUDIO_GEMINI_MODEL;
  if (!key || !model) {
    reply(res, 503, {
      ok: false,
      error: "مساعد Gemini غير مهيأ في مشروع Developer Studio المستقل. أضف DEVELOPER_STUDIO_GEMINI_API_KEY وDEVELOPER_STUDIO_GEMINI_MODEL إلى إعدادات هذا المشروع فقط.",
    });
    return;
  }

  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
  const now = Date.now();
  const entry = requestCounts.get(ip);
  if (!entry || now - entry.startedAt >= WINDOW_MS) {
    requestCounts.set(ip, { startedAt: now, count: 1 });
  } else {
    entry.count += 1;
    if (entry.count > MAX_REQUESTS_PER_WINDOW) {
      reply(res, 429, { ok: false, error: "تم تجاوز حد الطلبات المؤقت. حاول بعد دقيقة." });
      return;
    }
  }

  const prompt = String(req.body?.prompt || "").trim();
  if (!prompt || prompt.length > 4000) {
    reply(res, 400, { ok: false, error: "أدخل طلباً لا يتجاوز 4000 حرف." });
    return;
  }
  const context = req.body?.visualContext && typeof req.body.visualContext === "object"
    ? JSON.stringify(req.body.visualContext).slice(0, 8000)
    : "{}";

  const instruction = [
    "You are the isolated Developer Studio visual design assistant.",
    "Return one JSON object only with keys: message, summary, designSystemPatch, domEditPatch.",
    "designSystemPatch may contain colors and typography objects; only suggest valid CSS color/font values.",
    "domEditPatch may contain selector, styles (CSS property/value strings), and optional text.",
    "Use only the supplied visual context. Do not request or assume access to Juba, Supabase, private repositories, database credentials, or external user data.",
    "Never emit code execution instructions, secrets, API keys, or database operations.",
    "If a precise selector is not supplied, set domEditPatch to null and suggest only design tokens.",
    "User request: " + prompt,
    "Studio context: " + context
  ].join("\n\n");

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: instruction }] }],
          generationConfig: { temperature: 0.2, responseMimeType: "application/json" }
        }),
        signal: AbortSignal.timeout(25_000)
      }
    );
    const body = await response.json().catch(() => ({} as GeminiResponse)) as GeminiResponse;
    if (!response.ok) {
      reply(res, 502, { ok: false, error: body.error?.message || "Gemini request failed." });
      return;
    }
    const text = body.candidates?.[0]?.content?.parts?.map((part: GeminiPart) => part.text || "").join("").trim();
    if (!text) {
      reply(res, 502, { ok: false, error: "لم يرجع Gemini مقترحاً صالحاً." });
      return;
    }
    let parsed;
    try { parsed = JSON.parse(text); }
    catch { reply(res, 502, { ok: false, error: "استجابة Gemini ليست JSON صالحاً." }); return; }
    reply(res, 200, {
      ok: true,
      message: String(parsed.message || ""),
      summary: String(parsed.summary || "اقتراح تصميم"),
      designSystemPatch: parsed.designSystemPatch && typeof parsed.designSystemPatch === "object" ? parsed.designSystemPatch : null,
      domEditPatch: parsed.domEditPatch && typeof parsed.domEditPatch === "object" ? parsed.domEditPatch : null,
      model
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "تعذر الاتصال بمساعد التصميم.";
    reply(res, 502, { ok: false, error: message });
  }
}
