const DEFAULT_MODEL = "@cf/openai/gpt-oss-20b";

interface CloudflareAiRunResponse {
  success: boolean;
  errors?: { code: number; message: string }[];
  result?: unknown;
}

export type CloudflareStructuredJsonOptions = {
  maxTokens?: number;
  model?: string;
  temperature?: number;
};

export async function fetchCloudflareStructuredJson(
  systemPrompt: string,
  userPrompt: string,
  jsonSchema: object,
  options?: CloudflareStructuredJsonOptions
): Promise<unknown> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    throw new Error(
      "Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN environment variable."
    );
  }

  const model = options?.model ?? DEFAULT_MODEL;
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      // gpt-oss-20b bir "reasoning" modeli: yanıtlamadan önce dahili muhakeme
      // (reasoning_content) için de bu bütçeyi kullanır. Gerçek rapor
      // değerlendirmesi gibi çok alanlı/uzun JSON çıktısı gereken çağrılarda
      // 4096 genellikle muhakemeye harcanıp asıl içerik hiç üretilmeden
      // bitiyordu (bkz. E2E'de gözlenen "message.content is missing" hatası).
      max_tokens: options?.maxTokens ?? 16384,
      temperature: options?.temperature ?? 0.2,
      response_format: {
        type: "json_schema",
        json_schema: jsonSchema,
      },
    }),
  });

  const body: CloudflareAiRunResponse = await response.json();

  if (!response.ok || body.success !== true) {
    const cloudflareMessage =
      body.errors?.map((e) => e.message).join("; ") || "unknown error";
    throw new Error(
      `Cloudflare Workers AI request failed (status ${response.status}): ${cloudflareMessage}`
    );
  }

  const result = body.result;
  if (!result || typeof result !== "object") {
    throw new Error(
      "Invalid Cloudflare Workers AI response: result is not an object."
    );
  }

  const choices = (result as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new Error(
      "Invalid Cloudflare Workers AI response: choices is missing or empty."
    );
  }

  const message = (choices[0] as { message?: unknown } | undefined)?.message;
  if (!message || typeof message !== "object") {
    throw new Error(
      "Invalid Cloudflare Workers AI response: choices[0].message is missing."
    );
  }

  const content = (message as { content?: unknown }).content;
  if (typeof content !== "string" || content.length === 0) {
    throw new Error(
      "Invalid Cloudflare Workers AI response: message.content is missing or not a string."
    );
  }

  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error("Invalid JSON returned by AI", { cause: error });
  }
}
