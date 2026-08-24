import { useAppStore, type AppState } from "@/store/useAppStore";
import type { Category, ScoreCriterion } from "@/types";

export async function getCategories(): Promise<Category[]> {
  const res = await fetch("/api/categories");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Kategoriler alınamadı.");
  return data.categories;
}

export async function createCategory(
  input: Parameters<AppState["addCategory"]>[0],
): Promise<Category> {
  const res = await fetch("/api/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Kategori oluşturulamadı.");
  return data.category;
}

export async function updateCategory(
  id: string,
  updates: Parameters<AppState["updateCategory"]>[1],
): Promise<void> {
  const res = await fetch(`/api/categories/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "Kategori güncellenemedi.");
  }
}

/** Bir PDF'i mevcut storage abstraction'ına (R2 ya da local fallback) yükler, anahtarını döner. */
async function uploadPdf(file: File): Promise<{ key: string; fileName: string }> {
  const uploadUrlRes = await fetch("/api/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: "application/pdf",
      fileSize: file.size,
    }),
  });
  const uploadUrlData = await uploadUrlRes.json();
  if (!uploadUrlRes.ok) {
    throw new Error(uploadUrlData.error ?? "Yükleme linki alınamadı.");
  }

  const putRes = await fetch(uploadUrlData.url, {
    method: "PUT",
    headers: { "Content-Type": "application/pdf" },
    body: file,
  });
  if (!putRes.ok) {
    throw new Error("Dosya yüklenemedi.");
  }

  return { key: uploadUrlData.key, fileName: file.name };
}

export async function uploadCategorySpecification(id: string, file: File): Promise<Category> {
  const { key, fileName } = await uploadPdf(file);
  const res = await fetch(`/api/categories/${id}/specification`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName, key }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Şartname kaydedilemedi.");
  return data.category;
}

export async function uploadCategoryTemplate(id: string, file: File): Promise<Category> {
  const { key, fileName } = await uploadPdf(file);
  const res = await fetch(`/api/categories/${id}/report-template`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName, key }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Rapor şablonu kaydedilemedi.");
  return data.category;
}

export async function setCategoryReleaseDate(id: string, releaseAt: string | null): Promise<void> {
  const res = await fetch(`/api/categories/${id}/results-release`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ releaseAt }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "Yayın tarihi güncellenemedi.");
  }
}

export async function releaseCategoryResults(id: string): Promise<number> {
  const res = await fetch(`/api/categories/${id}/release-results`, { method: "POST" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Sonuçlar yayınlanamadı.");
  return data.publishedCount;
}

export async function setCategoryEvaluationDeadline(
  id: string,
  deadline: string | null,
): Promise<void> {
  const res = await fetch(`/api/categories/${id}/evaluation-deadline`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deadline }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "Son tarih güncellenemedi.");
  }
}

/**
 * "AI ile Yeniden Oluştur" — şartname metninden kriter üretimi, bu görevin
 * kapsamındaki 6 zorunlu AI MVP maddesinin dışında, yeni bir AI özelliği
 * gerektirir; bilinçli olarak dokunulmadı (bkz. proje notları).
 */
export function regenerateCategoryCriteria(id: string): Promise<ScoreCriterion[]> {
  return Promise.resolve(useAppStore.getState().regenerateCategoryCriteria(id));
}

export async function addCategoryCriterion(
  categoryId: string,
  input: { label: string; maxScore: number; description?: string },
): Promise<ScoreCriterion> {
  const res = await fetch(`/api/categories/${categoryId}/criteria`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Kriter eklenemedi.");
  return data.criterion;
}

export async function updateCategoryCriterion(
  categoryId: string,
  criterionId: string,
  updates: { label?: string; maxScore?: number; description?: string },
): Promise<void> {
  const res = await fetch(`/api/categories/${categoryId}/criteria/${criterionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "Kriter güncellenemedi.");
  }
}

export async function deleteCategoryCriterion(categoryId: string, criterionId: string): Promise<void> {
  const res = await fetch(`/api/categories/${categoryId}/criteria/${criterionId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "Kriter silinemedi.");
  }
}

export async function setCategorySubmissionWindow(
  id: string,
  opensAt: string | null,
  closesAt: string | null,
): Promise<void> {
  const res = await fetch(`/api/categories/${id}/submission-window`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ opensAt, closesAt }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "Gönderim penceresi güncellenemedi.");
  }
}
