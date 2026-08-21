import { auth } from "@/auth";
import type { UserRole } from "@/types";

/** Oturumu ve rolünü doğrular; yetkisizse null döner (çağıran taraf 401 üretir). */
export async function requireRole(...allowedRoles: UserRole[]) {
  const session = await auth();
  if (!session?.user || !allowedRoles.includes(session.user.role)) {
    return null;
  }
  return session;
}
