import { hash, verify } from "@node-rs/argon2";

/**
 * Argon2id (Section 10) with the OWASP baseline parameters: 19 MiB memory, 2 iterations,
 * 1 lane. Better Auth stores the PHC string ($argon2id$v=19$m=...) in accounts.password, so the
 * parameters can be raised later without breaking existing hashes.
 */
const OPTIONS = { algorithm: 2, memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

export async function verifyPassword({
  hash: stored,
  password,
}: {
  hash: string;
  password: string;
}): Promise<boolean> {
  // Only Argon2id hashes are accepted; anything else (legacy scrypt, empty) fails closed.
  if (!stored.startsWith("$argon2id$")) return false;
  try {
    return await verify(stored, password);
  } catch {
    return false;
  }
}
