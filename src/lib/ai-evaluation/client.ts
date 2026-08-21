import { z } from "zod";
import { evaluationOutputSchema, type EvaluationOutput } from "./schema";
import { fetchCloudflareStructuredJson } from "@/lib/ai-shared/cloudflare-workers-ai";

export async function callAiEvaluation(
  systemPrompt: string,
  userPrompt: string
): Promise<EvaluationOutput> {
  const rawOutput = await fetchCloudflareStructuredJson(
    systemPrompt,
    userPrompt,
    z.toJSONSchema(evaluationOutputSchema)
  );

  const parsedOutput = evaluationOutputSchema.safeParse(rawOutput);
  if (!parsedOutput.success) {
    throw new Error("Invalid AI evaluation output", {
      cause: parsedOutput.error,
    });
  }

  return parsedOutput.data;
}
