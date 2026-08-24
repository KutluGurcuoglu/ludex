/**
 * Rapor PDF'lerinin saklandığı yere port. İki implementasyonu var:
 * production/R2 kimlik bilgileri tanımlıysa `R2StorageProvider`, geliştirme
 * ortamında bunlar tanımlı değilse `LocalStorageProvider` (bkz.
 * src/lib/storage/index.ts). Call site'lar hangi implementasyonun aktif
 * olduğunu bilmek zorunda değildir.
 */
export interface StorageProvider {
  /** İstemcinin PDF'i doğrudan PUT edebileceği, kısa ömürlü bir yükleme URL'i üretir. */
  createUploadUrl(key: string, contentType: string, fileSize: number): Promise<string>;
  /** Nesne gerçekten yüklendiyse boyutunu döner; yoksa null. */
  headObject(key: string): Promise<{ contentLength: number } | null>;
  /** Tarayıcının PDF'i görüntülemek için doğrudan açabileceği bir URL üretir. */
  createViewUrl(key: string): Promise<string>;
  /** Ham dosya baytlarını döner (metin çıkarma gibi sunucu içi işlemler için). */
  getObjectBytes(key: string): Promise<Uint8Array>;
  /** Nesneyi kalıcı olarak siler (ör. bir kategori dokümanı yenisiyle değiştirildiğinde eskisini temizlemek için). Nesne zaten yoksa sessizce başarılı sayılır. */
  deleteObject(key: string): Promise<void>;
}
