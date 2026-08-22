import { NextResponse } from "next/server";
import { getUserRepository } from "@/lib/repositories/user-repository";
import { hashPassword } from "@/lib/auth/password";
import { registerInputSchema } from "@/lib/auth/schema";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const REGISTER_RATE_LIMIT = 5;
const REGISTER_RATE_WINDOW_MS = 60 * 60 * 1000; // 1 saat

export async function POST(req: Request) {
  if (!checkRateLimit(`register:${getClientIp(req)}`, REGISTER_RATE_LIMIT, REGISTER_RATE_WINDOW_MS)) {
    return NextResponse.json(
      { error: "Çok fazla kayıt denemesi yaptınız. Lütfen daha sonra tekrar deneyin." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const parsed = registerInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Geçersiz istek." },
      { status: 400 }
    );
  }

  const { name, email, phone, password, role } = parsed.data;
  const userRepository = getUserRepository();

  const existing = await userRepository.findByEmail(email);
  if (existing) {
    return NextResponse.json(
      { error: "Bu e-posta ile zaten bir hesap var." },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);
  const user = await userRepository.create({ name, email, phone, role, passwordHash });

  return NextResponse.json(
    {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    },
    { status: 201 }
  );
}
