import { R2StorageProvider } from "./r2-provider";
import { LocalStorageProvider } from "./local-provider";
import type { StorageProvider } from "./provider";

export type { StorageProvider } from "./provider";

export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME
  );
}

let cachedProvider: StorageProvider | undefined;

/**
 * R2 kimlik bilgileri tanımlıysa (her ortamda, production dahil) R2 kullanılır.
 * Tanımlı değilse yalnızca geliştirme ortamında yerel dosya depolamaya
 * düşülür — production'da R2 eksikse sessizce yerel depolamaya geçmek yerine
 * açık bir yapılandırma hatası fırlatılır.
 */
export function getStorageProvider(): StorageProvider {
  if (cachedProvider) return cachedProvider;

  if (isR2Configured()) {
    cachedProvider = new R2StorageProvider();
    return cachedProvider;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "R2 depolama yapılandırılmamış (R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / " +
        "R2_BUCKET_NAME eksik). Production'da yerel dosya depolamaya sessizce geçilmez."
    );
  }

  cachedProvider = new LocalStorageProvider();
  return cachedProvider;
}
