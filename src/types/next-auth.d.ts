import type { DefaultSession } from "next-auth";
import type { UserRole } from "@/types";

declare module "next-auth" {
  interface User {
    role: UserRole;
  }

  interface Session {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession["user"];
  }
}

// "next-auth/jwt" only re-exports (`export * from "@auth/core/jwt"`) in this
// version, so augmenting it doesn't merge with the JWT type actually used
// internally — the real interface lives in "@auth/core/jwt".
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
  }
}
