import type { JudgeApprovalStatus, User } from "@/types";

export async function getJudges(): Promise<User[]> {
  const res = await fetch("/api/users?role=judge");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Hakem listesi alınamadı.");
  return data.users;
}

export async function reviewJudgeApplication(
  judgeId: string,
  decision: Exclude<JudgeApprovalStatus, "pending">,
): Promise<void> {
  const res = await fetch(`/api/judges/${judgeId}/approval`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: decision }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "Hakem başvurusu güncellenemedi.");
  }
}

export async function setJudgeCategories(judgeId: string, categoryIds: string[]): Promise<void> {
  const res = await fetch(`/api/judges/${judgeId}/categories`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ categoryIds }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "Hakem kategorileri güncellenemedi.");
  }
}
