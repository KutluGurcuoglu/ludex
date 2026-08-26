import {
  evaluationInputSchema,
  evaluationOutputSchema,
  relevancePreflightInputSchema,
  type EvaluationOutput,
  type RelevanceAnalysis,
} from "./schema";
import {
  RELEVANCE_PREFLIGHT_SYSTEM_PROMPT,
  SYSTEM_PROMPT,
  buildEvaluationPrompt,
  buildRelevancePreflightPrompt,
} from "./prompts";
import { callAiEvaluation, callAiRelevancePreflight } from "./client";

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

export async function evaluateRelevancePreflight(input: unknown): Promise<RelevanceAnalysis> {
  const validatedInput = relevancePreflightInputSchema.parse(input);
  return callAiRelevancePreflight(
    RELEVANCE_PREFLIGHT_SYSTEM_PROMPT,
    buildRelevancePreflightPrompt(validatedInput)
  );
}
