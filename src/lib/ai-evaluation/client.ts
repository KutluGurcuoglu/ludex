import { z } from "zod";
import {
  aiEvaluationOutputSchema,
  evaluationOutputSchema,
  relevanceAnalysisSchema,
  type EvaluationOutput,
  type RelevanceAnalysis,
} from "./schema";
import { fetchCloudflareStructuredJson } from "@/lib/ai-shared/cloudflare-workers-ai";

export async function callAiEvaluation(
  systemPrompt: string,
  userPrompt: string
): Promise<EvaluationOutput> {
  const rawOutput = await fetchCloudflareStructuredJson(
    systemPrompt,
    userPrompt,
    z.toJSONSchema(aiEvaluationOutputSchema),
    // Gerçek kayıtlardaki en büyük tam JSON çıktısı yaklaşık 6.4 bin
    // karakterdir (19 şablon bölümü + 4 kriter dahil). 8192 output token,
    // bu gözlenen boyutun birkaç katı güvenlik payını bırakır. Ayrıca
    // server-owned similarReports/evidences/context/status alanları model
    // şemasından çıkarıldığı için bu bütçe yalnızca gerçek AI alanlarına gider.
    { model: "@cf/meta/llama-3.1-8b-instruct-fast", maxTokens: 8_192 }
  );

  const parsedOutput = evaluationOutputSchema.safeParse(rawOutput);
  if (!parsedOutput.success) {
    throw new Error("Invalid AI evaluation output", {
      cause: parsedOutput.error,
    });
  }

  return parsedOutput.data;
}

export async function callAiRelevancePreflight(
  systemPrompt: string,
  userPrompt: string
): Promise<RelevanceAnalysis> {
  const rawOutput = await fetchCloudflareStructuredJson(
    systemPrompt,
    userPrompt,
    z.toJSONSchema(relevanceAnalysisSchema),
    { model: "@cf/meta/llama-3.1-8b-instruct-fast", maxTokens: 1_800 }
  );

  const parsedOutput = relevanceAnalysisSchema.safeParse(rawOutput);
  if (!parsedOutput.success) {
    throw new Error("Invalid AI relevance preflight output", { cause: parsedOutput.error });
  }
  return parsedOutput.data;
}
