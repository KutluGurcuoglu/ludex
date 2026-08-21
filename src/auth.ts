import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { getUserRepository } from "@/lib/repositories/user-repository";
import { verifyPassword } from "@/lib/auth/password";
import { loginCredentialsSchema } from "@/lib/auth/schema";

export const { handlers, signIn, signOut, auth } = NextAuth({
  // TODO(db): "jwt" oturum stratejisi kullanılıyor çünkü henüz kalıcı bir
  // Session tablosu (Prisma) yok. feat/database-foundation birleşince
  // "database" stratejisine ve gerçek bir Adapter'a geçilmeli — bu, admin'in
  // bir hakemin oturumunu anında iptal edebilmesini sağlar (JWT'de bu mümkün
  // değildir, token süresi dolana kadar geçerli kalır).
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { type: "email", label: "E-posta" },
        password: { type: "password", label: "Şifre" },
      },
      authorize: async (rawCredentials) => {
        const parsed = loginCredentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const userRepository = getUserRepository();
        const user = await userRepository.findByEmail(email);
        if (!user) return null;

        const passwordMatches = await verifyPassword(password, user.passwordHash);
        if (!passwordMatches) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
      }
      return token;
    },
    session: ({ session, token }) => {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
  },
});
