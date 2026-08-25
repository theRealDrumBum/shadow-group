type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string | Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } }
  >;
};

export class OpenAIConfigError extends Error {
  status = 503;
  constructor(message = "OPENAI_API_KEY is not configured on the server.") {
    super(message);
    this.name = "OpenAIConfigError";
  }
}

export function openaiApiKey() {
  const key = process.env.OPENAI_API_KEY?.trim();
  return key || null;
}

export async function openaiJsonObject(messages: ChatMessage[], options?: { temperature?: number }) {
  const key = openaiApiKey();
  if (!key) throw new OpenAIConfigError();

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      temperature: options?.temperature ?? 0.2,
      response_format: { type: "json_object" },
      messages,
    }),
  });

  const payload = (await response.json().catch(() => null)) as {
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string } }>;
  } | null;

  if (!response.ok) {
    throw new Error(payload?.error?.message ?? `OpenAI request failed (${response.status}).`);
  }

  const content = payload?.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("OpenAI returned an empty response.");

  try {
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    throw new Error("OpenAI did not return valid JSON.");
  }
}
