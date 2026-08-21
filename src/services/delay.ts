/**
 * Gerçek bir backend gelene kadar ağ gecikmesini simüle eder.
 * Servis katmanındaki her fonksiyon bu sarmalayıcıdan geçer; backend entegrasyonunda
 * yalnızca bu dosyanın içeriği (veya her fonksiyonun gövdesi) fetch çağrısıyla değişecek.
 */
export function simulateNetworkDelay<T>(value: T, minMs = 900, maxMs = 1800): Promise<T> {
  const duration = minMs + Math.random() * (maxMs - minMs);
  return new Promise((resolve) => setTimeout(() => resolve(value), duration));
}
