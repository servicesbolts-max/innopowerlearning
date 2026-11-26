import { Mail, User } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import {
  Button,
  Card,
  EmptyState,
  ListRow,
  ListSection,
  Select,
  SelectItem,
  TextField,
} from "@/design-system";
import { listMembers, listOpenInvitations } from "@/modules/auth";
import { can } from "@/modules/rbac";
import { ActionForm } from "../../../../../_components/action-form";
import { staffPage } from "../../../../../_lib/guard";
import { AdminFrame } from "../_components/admin-frame";
import { inviteMemberAction } from "./actions";

export const instant = false;

type Props = { params: Promise<{ tenant: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("lms.admin.people");
  return { title: t("title"), robots: { index: false, follow: false } };
}

const INVITABLE = [
  "learner",
  "instructor",
  "teaching_assistant",
  "program_manager",
  "tenant_admin",
] as const;

export default async function PeoplePage({ params }: Props) {
  const { shell, session } = await staffPage((await params).tenant, "member.read", "/admin/people");
  const t = await getTranslations("lms.admin.people");
  const roles = await getTranslations("roles");
  const format = await getFormatter();
  const [members, invitations] = await Promise.all([
    listMembers(shell.id),
    listOpenInvitations(shell.id),
  ]);
  // Only tenant admins may hand out the admin role.
  const invitable = INVITABLE.filter(
    (r) => r !== "tenant_admin" || can(session.actor, "member.manage"),
  );

  return (
    <AdminFrame actor={session.actor} current="people" title={t("title")}>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {members.length === 0 ? (
            <EmptyState icon={User} title={t("empty")} headingLevel="h2" />
          ) : (
            <ListSection header={t("members")}>
              {members.map((m) => (
                <ListRow
                  key={m.userId}
                  icon={User}
                  iconTone="gray"
                  title={m.name || m.email}
                  subtitle={`${m.email} · ${t("joined", { date: format.dateTime(m.joinedAt, { dateStyle: "medium" }) })}`}
                  trailing={roles(m.role)}
                />
              ))}
            </ListSection>
          )}
          {invitations.length > 0 && (
            <ListSection header={t("pending")}>
              {invitations.map((i) => (
                <ListRow
                  key={i.id}
                  icon={Mail}
                  iconTone="orange"
                  title={i.email}
                  subtitle={t("expires", {
                    date: format.dateTime(i.expiresAt, { dateStyle: "medium" }),
                  })}
                  trailing={roles(i.role)}
                />
              ))}
            </ListSection>
          )}
        </div>
        {can(session.actor, "member.invite") && (
          <Card as="section" className="flex flex-col gap-3 self-start">
            <h2 className="text-title3">{t("invite")}</h2>
            <ActionForm action={inviteMemberAction} resetOnSuccess successMessage={t("sent")}>
              <TextField name="email" type="email" label={t("email")} isRequired maxLength={320} />
              <Select name="role" label={t("role")} defaultSelectedKey="learner">
                {invitable.map((r) => (
                  <SelectItem key={r} id={r}>
                    {roles(r)}
                  </SelectItem>
                ))}
              </Select>
              <Button type="submit">{t("send")}</Button>
            </ActionForm>
          </Card>
        )}
      </div>
    </AdminFrame>
  );
}
