import { config } from '../config.js';

export const aiConfigured = () => Boolean(config.openaiApiKey);

/**
 * Calls the OpenAI Chat Completions API from the server only (the key never reaches the browser)
 * and returns parsed JSON. Throws on failure so callers can fall back to the offline engine.
 */
export async function chatJson<T>(system: string, user: string, opts: { maxTokens?: number; temperature?: number } = {}): Promise<T> {
  if (!aiConfigured()) throw new Error('OPENAI_API_KEY not configured');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 45000);
  try {
    const res = await fetch(`${config.openaiBaseUrl}/chat/completions`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.openaiApiKey}` },
      body: JSON.stringify({
        model: config.openaiModel,
        temperature: opts.temperature ?? 0.3,
        max_tokens: opts.maxTokens ?? 1500,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: `${system}\nRespond with a single JSON object only.` },
          { role: 'user', content: user },
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = (await res.json()) as any;
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty AI response');
    return JSON.parse(content) as T;
  } finally {
    clearTimeout(timer);
  }
}

/** Truncate user-provided text before sending it to the model. */
export const clip = (s: string, n = 12000) => (s.length > n ? `${s.slice(0, n)}\n…[truncated]` : s);
