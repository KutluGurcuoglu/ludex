import { z } from "zod";

export const loginCredentialsSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(200),
});

export const registerInputSchema = z.object({
  name: z.string().trim().min(2).max(200),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(5).max(30),
  password: z.string().min(8, "Şifre en az 8 karakter olmalıdır.").max(200),
  role: z.enum(["contestant", "judge"]),
});
