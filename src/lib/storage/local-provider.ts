import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StorageProvider } from "./provider";

/** Repo kökünün dışına asla çıkmayan, git'e eklenmeyen (.gitignore) sabit bir kök dizin. */
const STORAGE_ROOT = path.join(process.cwd(), ".local-storage");

/** /api/upload-url'in ürettiği anahtarlarla birebir aynı desen — başka hiçbir anahtar kabul edilmez. */
const KEY_PATTERN = /^pdfs\/[a-zA-Z0-9-]+\.pdf$/;

/** Anahtarı doğrular ve STORAGE_ROOT dışına çıkamayacağını garanti eden mutlak yolu döner. */
export function resolveLocalStoragePath(key: string): string {
  if (!KEY_PATTERN.test(key)) {
    throw new Error(`Geçersiz depolama anahtarı: ${key}`);
  }

  const resolved = path.resolve(STORAGE_ROOT, key);
  if (resolved !== path.normalize(resolved) || !resolved.startsWith(STORAGE_ROOT + path.sep)) {
    throw new Error(`Geçersiz depolama anahtarı: ${key}`);
  }
  return resolved;
}

function getAppUrl(): string {
  return process.env.APP_URL ?? "http://localhost:3000";
}

/**
 * Yalnızca geliştirme ortamı için: R2 kimlik bilgileri tanımlı olmadığında
 * kullanılan dosya sistemi tabanlı depolama. Yükleme/görüntüleme URL'leri,
 * dosyaları gerçekten okuyup yazan /api/local-storage/[...key] route'una
 * işaret eder (bkz. src/lib/storage/index.ts — production'da hiç seçilmez).
 */
export class LocalStorageProvider implements StorageProvider {
  async createUploadUrl(key: string): Promise<string> {
    resolveLocalStoragePath(key);
    return `${getAppUrl()}/api/local-storage/${key}`;
  }

  async headObject(key: string): Promise<{ contentLength: number } | null> {
    try {
      const stats = await stat(resolveLocalStoragePath(key));
      return { contentLength: stats.size };
    } catch {
      return null;
    }
  }

  async createViewUrl(key: string): Promise<string> {
    resolveLocalStoragePath(key);
    return `${getAppUrl()}/api/local-storage/${key}`;
  }

  async getObjectBytes(key: string): Promise<Uint8Array> {
    return new Uint8Array(await readFile(resolveLocalStoragePath(key)));
  }

  /** Yalnızca /api/local-storage route'u tarafından çağrılır — StorageProvider arayüzünün parçası değildir. */
  async writeObject(key: string, bytes: Uint8Array): Promise<void> {
    const filePath = resolveLocalStoragePath(key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, bytes);
  }
}
