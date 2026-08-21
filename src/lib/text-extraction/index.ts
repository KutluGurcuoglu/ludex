import { LlamaParseTextExtractor } from "./llamaparse-extractor";
import { MockTextExtractor } from "./mock-extractor";

export type { ExtractedDocument, TextExtractor } from "./extractor";

export function getTextExtractor() {
  const apiKey = process.env.LLAMA_CLOUD_API_KEY;
  return apiKey ? new LlamaParseTextExtractor(apiKey) : new MockTextExtractor();
}
