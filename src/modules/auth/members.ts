import { and, asc, count, desc, eq, gt, isNull } from "drizzle-orm";
import { invitations, memberships, users, type TenantRole } from "@/db/schema";
import { withTenant } from "@/modules/tenancy";

/** People in a tenant (Partner Admin). Rows are limited to the tenant by RLS. */
export interface Member {
  userId: string;
  name: string;
  email: string;
  role: TenantRole;
  status: "active" | "pending" | "suspended";
  joinedAt: Date;
}

export function listMembers(tenantId: string): Promise<Member[]> {
  return withTenant({ tenantId }, (tx) =>
    tx
      .select({
        userId: memberships.userId,
        name: users.name,
        email: users.email,
        role: memberships.role,
        status: memberships.status,
        joinedAt: memberships.createdAt,
      })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(isNull(memberships.deletedAt))
      .orderBy(asc(users.name), asc(users.email))
      .limit(500),
  );
}

export function listOpenInvitations(tenantId: string) {
  return withTenant({ tenantId }, (tx) =>
    tx
      .select({
        id: invitations.id,
        email: invitations.email,
        role: invitations.role,
        expiresAt: invitations.expiresAt,
      })
      .from(invitations)
      .where(
        and(
          isNull(invitations.acceptedAt),
          isNull(invitations.deletedAt),
          gt(invitations.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(invitations.createdAt))
      .limit(200),
  );
}

export function memberCount(tenantId: string): Promise<number> {
  return withTenant({ tenantId }, async (tx) => {
    const [row] = await tx
      .select({ n: count() })
      .from(memberships)
      .where(and(isNull(memberships.deletedAt), eq(memberships.status, "active")));
    return row?.n ?? 0;
  });
}
