/**
 * Ludex Copilot — POST /api/reports/:id/copilot çağırır. Analiz henüz hazır/
 * güncel değilse sunucu bunun gerçek nedenini `reply` içinde döner (LLM'e
 * hiç gidilmez); analiz güncelse gerçek, rapora özel bir yanıt döner.
 */
export async function askCopilot(reportId: string, question: string): Promise<string> {
  const res = await fetch(`/api/reports/${reportId}/copilot`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error ?? "Ludex Copilot şu anda yanıt veremiyor.");
  }
  return data.reply;
}
