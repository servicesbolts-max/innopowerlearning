---
name: add-server-action
description: Add a state-changing server action through defineAction (session bound to the tenant, 2FA gate, Zod, can(), audited change inside withTenant), with tests.
argument-hint: <module/actionName, e.g. courses/publishCourse>
---

Add the server action **$ARGUMENTS**. Read `CLAUDE.md` (non-negotiables) and `src/modules/auth/action.ts` first.

1. **Permission.** Pick the permission string from `src/modules/rbac/permissions.ts`.
   - If none fits, add one to `PERMISSIONS`, grant it in `ROLE_GRANTS` with a scope (`any`, `own` or `assigned`), and extend the expected matrix in `src/modules/rbac/permissions.test.ts` in the same change. The matrix is the contract.
   - Password, security and payment permissions also belong in `BLOCKED_WHILE_IMPERSONATING`.
2. **Module logic.** Put the data change in the owning module (`src/modules/<name>`). Export only what the action needs from its `index.ts`. Queries use the `tx` that `defineAction` passes in, so the change and its audit entry commit together.
3. **The action.** Create `src/app/.../actions.ts` with `"use server"`:

   ```ts
   "use server";
   import { z } from "zod";
   import { defineAction } from "@/modules/auth";
   import { courses } from "@/modules/courses";

   export const publishCourse = defineAction(
     {
       schema: z.object({ courseId: z.uuid() }),
       permission: "course.publish",
       // For own/assigned grants: load the resource inside the tenant transaction.
       resource: async (tx, input) => courses.ownerOf(tx, input.courseId),
       audit: (input) => ({
         action: "course.published",
         target: { type: "course", id: input.courseId },
       }),
     },
     async ({ tx, input, actor }) => courses.publish(tx, input.courseId, actor.userId),
   );
   ```

   - The helper resolves the tenant from the proxy's trusted header and the session bound to it, refuses admins without a second factor, validates with Zod, checks `can()`, then runs your handler and writes the audit entry in one `withTenant` transaction.
   - Expected failures come back as `{ ok: false, error }`. Throw `ActionFailure("conflict")` (or another code) inside the handler to return a failure without writing anything.
   - Audit metadata holds ids and short codes only: no emails, names, free text or secrets. The schema rejects keys that look like PII.
   - Never trust ids from the client for ownership: load the resource and let `can()` decide.

4. **UI.** Call the action from a client component. Show `error` with a translated message (`messages/en.json`), and keep one clear action per screen.
5. **Tests.**
   - Unit: any pure logic in the module.
   - Integration (`tests/integration/`): the change happens for an allowed actor and not for a denied one, the audit row exists, and nothing crosses tenants.
   - E2E: when the action is part of an acceptance flow.
6. **Verify:** `pnpm gate`, then `pnpm test:integration`.
