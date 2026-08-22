/**
 * Basit, bellek içi sabit-pencere (fixed-window) rate limiter. Diğer
 * repository'lerle aynı sebeple globalThis üzerinde tutulur: Next.js dev
 * sunucusu hot-reload'da modülleri sıfırlayabilir.
 *
 * Not: Bu implementasyon tek bir süreç içinde çalışır — Vercel gibi çoklu
 * serverless instance'a yayılan bir production ortamında instance'lar
 * arasında sayaç paylaşılmaz (her instance kendi sınırını ayrı sayar).
 * Gerçek production'a geçmeden önce paylaşılan bir depoya (Upstash Redis vb.)
 * taşınmalı; şimdilik hackathon kapsamında tek-instance geliştirme/demo
 * senaryosu için yeterli bir kaba koruma sağlar.
 */

interface WindowEntry {
  count: number;
  resetAt: number;
}

const globalForRateLimit = globalThis as unknown as {
  __rateLimitBuckets?: Map<string, WindowEntry>;
};

function getBuckets(): Map<string, WindowEntry> {
  if (!globalForRateLimit.__rateLimitBuckets) {
    globalForRateLimit.__rateLimitBuckets = new Map();
  }
  return globalForRateLimit.__rateLimitBuckets;
}

/**
 * `key` için son `windowMs` içinde en fazla `limit` çağrıya izin verir.
 * Sınır aşıldıysa false döner (çağıran taraf 429 üretmeli).
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const buckets = getBuckets();
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || entry.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count += 1;
  return true;
}

/** İstek nesnesinden en iyi çabayla istemci IP'sini çıkarır. */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
