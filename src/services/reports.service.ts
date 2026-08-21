import type { Report } from "@/types";

export async function getReports(): Promise<Report[]> {
  const res = await fetch("/api/reports");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Raporlar alınamadı.");
  return data.reports;
}

export async function submitReport(input: {
  categoryId: string;
  title: string;
  file: File;
}): Promise<Report> {
  const uploadUrlRes = await fetch("/api/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: input.file.name,
      contentType: "application/pdf",
      fileSize: input.file.size,
    }),
  });
  const uploadUrlData = await uploadUrlRes.json();
  if (!uploadUrlRes.ok) {
    throw new Error(uploadUrlData.error ?? "Yükleme linki alınamadı.");
  }

  const putRes = await fetch(uploadUrlData.url, {
    method: "PUT",
    headers: { "Content-Type": "application/pdf" },
    body: input.file,
  });
  if (!putRes.ok) {
    throw new Error("Dosya R2'ye yüklenemedi.");
  }

  const reportRes = await fetch("/api/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: input.title,
      categoryId: input.categoryId,
      r2Key: uploadUrlData.key,
      fileName: input.file.name,
    }),
  });
  const reportData = await reportRes.json();
  if (!reportRes.ok) {
    throw new Error(reportData.error ?? "Rapor oluşturulamadı.");
  }
  return reportData.report;
}

export async function assignReports(reportIds: string[], judgeId: string): Promise<void> {
  const results = await Promise.all(
    reportIds.map((id) =>
      fetch(`/api/reports/${id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ judgeId }),
      }),
    ),
  );
  const failed = results.find((r) => !r.ok);
  if (failed) throw new Error("Bazı raporlar hakeme atanamadı.");
}

export async function unassignJudge(reportId: string, judgeId: string): Promise<void> {
  const res = await fetch(`/api/reports/${reportId}/assign/${judgeId}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "Hakem ataması kaldırılamadı.");
  }
}
