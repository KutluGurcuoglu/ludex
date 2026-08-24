import { z } from "zod";
import { copilotOutputSchema } from "./copilot-schema";
import { COPILOT_SYSTEM_PROMPT, buildCopilotPrompt, type CopilotContext } from "./copilot-prompts";
import { fetchCloudflareStructuredJson } from "@/lib/ai-shared/cloudflare-workers-ai";

/**
 * Ludex Copilot'un tek gerçek çağrı noktası. Ayrı bir AI sağlayıcı veya model
 * kullanmaz — mevcut Cloudflare Workers AI altyapısını ve varsayılan modeli
 * (@cf/openai/gpt-oss-20b) evaluate.ts ile birebir aynı şekilde kullanır.
 */
export async function answerCopilotQuestion(
  context: CopilotContext,
  question: string
): Promise<string> {
  const userPrompt = buildCopilotPrompt(context, question);
  const rawOutput = await fetchCloudflareStructuredJson(
    COPILOT_SYSTEM_PROMPT,
    userPrompt,
    z.toJSONSchema(copilotOutputSchema)
  );

  const parsed = copilotOutputSchema.safeParse(rawOutput);
  if (!parsed.success) {
    throw new Error("Invalid AI copilot output", { cause: parsed.error });
  }

  return parsed.data.answer;
}
