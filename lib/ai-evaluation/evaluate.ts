import {
  evaluationInputSchema,
  evaluationOutputSchema,
  type EvaluationOutput,
} from "./schema";
import { SYSTEM_PROMPT, buildEvaluationPrompt } from "./prompts";
import { callAiEvaluation } from "./client";

export async function evaluateReport(input: unknown): Promise<EvaluationOutput> {
  const validatedInput = evaluationInputSchema.parse(input);
  const userPrompt = buildEvaluationPrompt(validatedInput);
  const result = await callAiEvaluation(SYSTEM_PROMPT, userPrompt);

  const parsedOutput = evaluationOutputSchema.safeParse(result);
  if (!parsedOutput.success) {
    throw new Error("Invalid AI evaluation output", {
      cause: parsedOutput.error,
    });
  }

  return parsedOutput.data;
}
