import { z } from "zod";
import { evaluateReport } from "@/lib/ai-evaluation/evaluate";
import {
  sihaKtrCategory,
  sihaKtrTemplate,
  sihaKtrEvaluationCriteria,
} from "@/lib/ai-evaluation/data/siha-ktr-2026";

const requestBodySchema = z.object({
  reportContent: z.string().min(1),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const { reportContent } = requestBodySchema.parse(body);

    const result = await evaluateReport({
      reportContent,
      category: sihaKtrCategory,
      template: sihaKtrTemplate,
      evaluationCriteria: sihaKtrEvaluationCriteria,
    });

    return Response.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid evaluation input", issues: error.issues },
        { status: 400 }
      );
    }

    console.error(error);
    return Response.json({ error: "Evaluation failed" }, { status: 500 });
  }
}
