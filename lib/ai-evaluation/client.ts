import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { evaluationOutputSchema, type EvaluationOutput } from "./schema";

const MODEL = "claude-sonnet-5";
const MAX_TOKENS = 16000;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function callClaudeEvaluation(
  systemPrompt: string,
  userPrompt: string
): Promise<EvaluationOutput> {
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
    output_config: {
      format: zodOutputFormat(evaluationOutputSchema),
    },
  });

  if (response.parsed_output === null) {
    throw new Error(
      "Claude yapılandırılmış bir çıktı üretemedi (parsed_output null)."
    );
  }

  return response.parsed_output;
}
