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
    z.toJSONSchema(evaluationOutputSchema),
    // Problem 4 ile şema büyüdü (specificationAnalysis, sayfa/alıntı alanları,
    // evidences) — gpt-oss-20b bir "reasoning" modeli olduğu için önce dahili
    // reasoning_content üretip token bütçesini tüketiyor, asıl JSON içerik
    // ondan SONRA geliyor. 16384'ün bu daha büyük şema için yetersiz kaldığı
    // gözlemlendi ("message.content is missing" hatası) — üst sınırı yükseltiyoruz.
    { maxTokens: 32768 }
  );

  const parsedOutput = evaluationOutputSchema.safeParse(rawOutput);
  if (!parsedOutput.success) {
    throw new Error("Invalid AI evaluation output", {
      cause: parsedOutput.error,
    });
  }

  return parsedOutput.data;
}
