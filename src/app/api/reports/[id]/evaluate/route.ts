import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/require-role";
import { getReportRepository } from "@/lib/repositories/report-repository";
import { getCategoryRepository } from "@/lib/repositories/category-repository";
import { evaluateReport } from "@/lib/ai-evaluation/evaluate";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole("admin", "judge");
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  }

  const { id } = await params;
  const reportRepository = getReportRepository();
  const report = await reportRepository.findById(id);
  if (!report) {
    return NextResponse.json({ error: "Rapor bulunamadı." }, { status: 404 });
  }

  // Hakem yalnızca kendisine atanmış raporu değerlendirebilir; admin her raporu tetikleyebilir.
  if (session.user.role === "judge" && report.assignedJudgeId !== session.user.id) {
    return NextResponse.json({ error: "Bu rapor size atanmamış." }, { status: 403 });
  }

  if (!report.extractedText) {
    return NextResponse.json(
      { error: "Rapor metni henüz çıkarılmamış, AI değerlendirmesi başlatılamaz." },
      { status: 409 }
    );
  }

  const category = await getCategoryRepository().findById(report.categoryId);
  if (!category) {
    return NextResponse.json({ error: "Rapora ait kategori bulunamadı." }, { status: 404 });
  }

  if (category.templateSections.length === 0 || category.evaluationCriteria.length === 0) {
    return NextResponse.json(
      {
        error:
          "Bu kategori için şablon bölümleri ve/veya değerlendirme kriterleri henüz admin tarafından tanımlanmamış.",
      },
      { status: 409 }
    );
  }

  try {
    const evaluation = await evaluateReport({
      reportContent: report.extractedText,
      category: category.name,
      template: { sections: category.templateSections },
      evaluationCriteria: category.evaluationCriteria,
    });

    await reportRepository.setAiEvaluation(report.id, evaluation);
    if (report.status === "assigned") {
      await reportRepository.setStatus(report.id, "in_review");
    }

    return NextResponse.json({ success: true, evaluation });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Geçersiz değerlendirme girdisi.", issues: error.issues },
        { status: 400 }
      );
    }

    console.error(`AI değerlendirme hatası (report ${report.id}):`, error);
    return NextResponse.json({ error: "AI değerlendirmesi başarısız oldu." }, { status: 500 });
  }
}
