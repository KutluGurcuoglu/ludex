import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getNotificationRepository } from "@/lib/repositories/notification-repository";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  }

  const notifications = await getNotificationRepository().listForUser(session.user.id);
  return NextResponse.json({ notifications });
}
