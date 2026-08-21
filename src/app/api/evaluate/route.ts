import { z } from "zod";
import { evaluateReport } from "@/lib/ai-evaluation/evaluate";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const result = await evaluateReport(body);
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
