import {
  evaluationInputSchema,
  evaluationOutputSchema,
  type EvaluationOutput,
} from "./schema";
import { SYSTEM_PROMPT, buildEvaluationPrompt } from "./prompts";
import { callClaudeEvaluation } from "./client";

export async function evaluateReport(input: unknown): Promise<EvaluationOutput> {
  const validatedInput = evaluationInputSchema.parse(input);
  const userPrompt = buildEvaluationPrompt(validatedInput);
  const result = await callClaudeEvaluation(SYSTEM_PROMPT, userPrompt);
  return evaluationOutputSchema.parse(result);
}
