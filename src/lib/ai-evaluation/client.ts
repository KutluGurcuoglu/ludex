import { z } from "zod";
import {
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
    z.toJSONSchema(evaluationOutputSchema),
    // Demo E2E'de gerçek full evaluation ~75 saniye sürdü — gpt-oss-20b bir
    // "reasoning" modeli olduğu için yanıtlamadan önce dahili muhakeme
    // (reasoning_content) üretip max_tokens bütçesinin büyük kısmını
    // tüketiyordu (bu yüzden önceden 32768'e çıkarılmıştı). llama-3.1-8b-
    // instruct-fast bir reasoning modeli DEĞİLDİR — gizli bir muhakeme
    // aşaması yok, max_tokens'ın tamamı doğrudan görünür JSON çıktısına
    // gidiyor ve model daha küçük/hızlı olduğu için yanıt süresi de kısalıyor.
    //
    // 8192, mevcut şema için gerçekçi bir üst sınırdır: tipik bir demo
    // senaryosunda (4 kriter, ~10-15 şablon bölümü, 0-birkaç şartname
    // bulgusu) beklenen JSON çıktısı bunun çok altında kalır — her
    // criteriaEvaluations/headingContentAnalysis/specificationAnalysis.
    // findings öğesi kısa (reason/notes birkaç cümle, evidence/exactExcerpt
    // tek bir alıntı) olduğundan, hiçbir alan kesilmeden (kriterler, şablon
    // bölümleri, bulgular, strengths/areasForImprovement/recommendations
    // dahil) tamamı için yeterli alan bırakır.
    { model: "@cf/meta/llama-3.1-8b-instruct-fast", maxTokens: 12000 }
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
