/**
 * SHA-256 via the Web Crypto API — keeps passwords out of localStorage as plaintext.
 * This is still client-side-only obfuscation, not real authentication security: a
 * production backend must hash with a salted, slow algorithm (bcrypt/argon2) server-side.
 */
export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
