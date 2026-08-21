import { NextResponse } from "next/server";
import { getUserRepository } from "@/lib/repositories/user-repository";
import { hashPassword } from "@/lib/auth/password";
import { registerInputSchema } from "@/lib/auth/schema";

export async function POST(req: Request) {
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
