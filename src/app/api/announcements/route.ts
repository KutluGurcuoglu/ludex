import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { getNotificationRepository } from "@/lib/repositories/notification-repository";

const schema = z.object({
  audience: z.enum(["contestants", "judges", "both", "custom"]),
  userIds: z.array(z.string()).optional(),
  categoryId: z.string().optional(),
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().max(5000).optional(),
});

export async function POST(req: Request) {
  const session = await requireRole("admin");
  if (!session) return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });

  let input: z.infer<typeof schema>;
  try {
    input = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Geçersiz duyuru bilgileri." }, { status: 400 });
  }

  const roles: Role[] = input.audience === "contestants"
    ? [Role.CONTESTANT]
    : input.audience === "judges"
      ? [Role.JUDGE]
      : [Role.CONTESTANT, Role.JUDGE];
  const users = await db.user.findMany({
    where: input.audience === "custom"
      ? { id: { in: input.userIds ?? [] }, role: { in: [Role.CONTESTANT, Role.JUDGE] } }
      : {
          role: { in: roles },
          ...(input.categoryId
            ? {
                OR: [
                  { judgeCategories: { some: { categoryId: input.categoryId } } },
                  { reports: { some: { categoryId: input.categoryId } } },
                ],
              }
            : {}),
        },
    select: { id: true, role: true },
  });

  await Promise.all(users.map((user) => getNotificationRepository().create({
    userId: user.id,
    kind: "announcement",
    title: input.title,
    body: input.body || undefined,
    link: user.role === "JUDGE" ? "/judge" : "/contestant",
  })));

  return NextResponse.json({ success: true, count: users.length });
}
