import { RouteGuard } from "@/components/auth/route-guard";
import { EvaluationWorkspace } from "@/components/judge/evaluation-workspace";

export default async function JudgeEvaluationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <RouteGuard allow={["judge"]}>
      <EvaluationWorkspace reportId={id} />
    </RouteGuard>
  );
}
