import { randomBytes } from "node:crypto";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { certificates, courses, users } from "@/db/schema";
import { uuidv7 } from "@/lib/ids";
import { withTenant, type TenantTx } from "@/modules/tenancy";

/**
 * Certificates (MVP slice M5): issued once per completed enrollment, verifiable by a 12-character
 * code on the issuing tenant's host. Codes are random (60 bits), so they cannot be enumerated.
 */
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export const CERTIFICATE_CODE = /^[A-Z2-7]{12}$/;

export function newCertificateCode(): string {
  const bytes = randomBytes(12);
  let out = "";
  for (const b of bytes) out += ALPHABET[b & 31];
  return out;
}

export interface Certificate {
  id: string;
  code: string;
  recipientName: string;
  courseTitle: string;
  courseSlug: string | null;
  issuedAt: Date;
  userId: string;
}

/** Issues the certificate for a completed enrollment (idempotent); returns it. */
export async function issueCertificate(
  tx: TenantTx,
  tenantId: string,
  input: { enrollmentId: string; courseId: string; userId: string; courseTitle: string },
): Promise<{ id: string; code: string }> {
  const [existing] = await tx
    .select({ id: certificates.id, code: certificates.code })
    .from(certificates)
    .where(eq(certificates.enrollmentId, input.enrollmentId));
  if (existing) return existing;
  const [user] = await tx
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, input.userId));
  const recipientName = (user?.name.trim() || user?.email.split("@")[0] || input.userId).slice(
    0,
    200,
  );
  const id = uuidv7();
  const code = newCertificateCode();
  await tx.insert(certificates).values({
    tenantId,
    id,
    enrollmentId: input.enrollmentId,
    courseId: input.courseId,
    userId: input.userId,
    code,
    recipientName,
    courseTitle: input.courseTitle.slice(0, 160),
    createdBy: input.userId,
  });
  return { id, code };
}

const columns = {
  id: certificates.id,
  code: certificates.code,
  recipientName: certificates.recipientName,
  courseTitle: certificates.courseTitle,
  courseSlug: courses.slug,
  issuedAt: certificates.issuedAt,
  userId: certificates.userId,
};

/** A valid certificate by code, in this tenant only (public verification). */
export function getCertificateByCode(tenantId: string, code: string): Promise<Certificate | null> {
  const normalized = code.trim().toUpperCase();
  if (!CERTIFICATE_CODE.test(normalized)) return Promise.resolve(null);
  return withTenant({ tenantId }, async (tx) => {
    const [row] = await tx
      .select(columns)
      .from(certificates)
      .leftJoin(
        courses,
        and(eq(courses.tenantId, certificates.tenantId), eq(courses.id, certificates.courseId)),
      )
      .where(
        and(
          eq(certificates.code, normalized),
          isNull(certificates.revokedAt),
          isNull(certificates.deletedAt),
        ),
      );
    return row ?? null;
  });
}

/** The user's certificates, newest first, keyed by course id. */
export function listMyCertificates(tenantId: string, userId: string) {
  return withTenant({ tenantId }, async (tx) => {
    const rows = await tx
      .select({ courseId: certificates.courseId, code: certificates.code })
      .from(certificates)
      .where(
        and(
          eq(certificates.userId, userId),
          isNull(certificates.revokedAt),
          isNull(certificates.deletedAt),
        ),
      )
      .orderBy(desc(certificates.issuedAt));
    return new Map(rows.map((r) => [r.courseId, r.code]));
  });
}

export function certificateCount(tenantId: string): Promise<number> {
  return withTenant({ tenantId }, async (tx) => {
    const [row] = await tx
      .select({ n: count() })
      .from(certificates)
      .where(and(isNull(certificates.revokedAt), isNull(certificates.deletedAt)));
    return row?.n ?? 0;
  });
}
