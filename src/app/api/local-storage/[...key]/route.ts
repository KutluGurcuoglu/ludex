import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isR2Configured } from "@/lib/storage";
import { LocalStorageProvider, resolveLocalStoragePath } from "@/lib/storage/local-provider";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB — /api/upload-url ile aynı sınır

/**
 * Yalnızca geliştirme ortamında, R2 kimlik bilgileri tanımlı olmadığında
 * kullanılan yerel dosya depolama uç noktası. R2 tanımlıysa (dolayısıyla
 * gerçek storage provider R2'yse) bu route hiçbir işlev görmemeli — R2'nin
 * kendi presigned URL'leri kullanılır (bkz. src/lib/storage/index.ts).
 */
function ensureLocalStorageActive(): NextResponse | null {
  if (isR2Configured()) {
    return NextResponse.json({ error: "Bulunamadı." }, { status: 404 });
  }
  return null;
}

function keyFromParams(key: string[]): string {
  return key.join("/");
}

export async function PUT(req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const guard = ensureLocalStorageActive();
  if (guard) return guard;

  const session = await auth();
  // Yarışmacı rapor PDF'i, admin şartname/rapor şablonu PDF'i yüklemek için kullanır
  // (bkz. /api/upload-url — bu route yalnızca o uçtan alınan anahtarlarla çağrılır).
  if (!session?.user || (session.user.role !== "contestant" && session.user.role !== "admin")) {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  }

  const { key: keyParts } = await params;
  const key = keyFromParams(keyParts);

  try {
    resolveLocalStoragePath(key);
  } catch {
    return NextResponse.json({ error: "Geçersiz depolama anahtarı." }, { status: 400 });
  }

  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (!contentLength || contentLength > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Dosya çok büyük ya da boş." }, { status: 413 });
  }

  const bytes = new Uint8Array(await req.arrayBuffer());
  if (bytes.byteLength > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Dosya çok büyük." }, { status: 413 });
  }

  await new LocalStorageProvider().writeObject(key, bytes);
  return NextResponse.json({ success: true });
}

export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const guard = ensureLocalStorageActive();
  if (guard) return guard;

  const { key: keyParts } = await params;
  const key = keyFromParams(keyParts);

  try {
    const bytes = await new LocalStorageProvider().getObjectBytes(key);
    return new NextResponse(Buffer.from(bytes), {
      headers: { "Content-Type": "application/pdf" },
    });
  } catch {
    return NextResponse.json({ error: "Dosya bulunamadı." }, { status: 404 });
  }
}
