import { z } from "zod";
import { analyzeTemplate } from "@/lib/ai-template-analysis/analyze";

const requestBodySchema = z.object({
  templateContent: z.string().min(1),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const { templateContent } = requestBodySchema.parse(body);

    const result = await analyzeTemplate({ templateContent });

    return Response.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid template analysis input", issues: error.issues },
        { status: 400 }
      );
    }

    console.error(error);
    return Response.json(
      { error: "Template analysis failed" },
      { status: 500 }
    );
  }
}
