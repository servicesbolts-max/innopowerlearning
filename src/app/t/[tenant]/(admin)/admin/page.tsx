import { Award, BookOpen, CircleCheck, GraduationCap, Globe, Users } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Badge, Icon, ListRow, ListSection } from "@/design-system";
import { memberCount } from "@/modules/auth";
import { learningCounts, listAllCourses } from "@/modules/courses";
import { certificateCount } from "@/modules/credentials";
import { can } from "@/modules/rbac";
import { staffPage } from "../../../../_lib/guard";
import { AdminFrame } from "./_components/admin-frame";

// Blocks on params by design: see the tenant layout.
export const instant = false;

type Props = { params: Promise<{ tenant: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.admin");
  return { title: t("title"), robots: { index: false, follow: false } };
}

/**
 * Partner Admin dashboard (MVP slice M6). Guarded on the server: signed in on this tenant, a
 * second factor for admin roles (Section 10), and member.read. Instructors go to their courses.
 */
export default async function AdminPage({ params }: Props) {
  const { tenant } = await params;
  const { shell, session } = await staffPage(tenant, "course.create", "/admin");
  if (!can(session.actor, "member.read")) redirect("/admin/courses");
  const t = await getTranslations("lms");
  const [members, learning, certificates, courses] = await Promise.all([
    memberCount(shell.id),
    learningCounts(shell.id),
    certificateCount(shell.id),
    listAllCourses(shell.id),
  ]);

  const stats = [
    { icon: Users, label: t("admin.dashboard.members"), value: members },
    { icon: BookOpen, label: t("admin.dashboard.courses"), value: learning.courses },
    { icon: Globe, label: t("admin.dashboard.published"), value: learning.published },
    { icon: GraduationCap, label: t("admin.dashboard.enrollments"), value: learning.enrollments },
    { icon: CircleCheck, label: t("admin.dashboard.completions"), value: learning.completions },
    { icon: Award, label: t("admin.dashboard.certificates"), value: certificates },
  ];

  return (
    <AdminFrame
      actor={session.actor}
      current="dashboard"
      title={t("admin.dashboard.heading", { org: shell.name })}
    >
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col gap-1 rounded-card bg-bg-secondary p-4">
            <dt className="flex items-center gap-2 text-subheadline text-label-secondary">
              <Icon icon={s.icon} size={16} className="text-accent-text" />
              {s.label}
            </dt>
            <dd className="text-title1 font-semibold tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>
      {courses.length > 0 && (
        <ListSection header={t("admin.dashboard.recent")}>
          {courses.slice(0, 5).map((c) => (
            <ListRow
              key={c.id}
              href={`/admin/courses/${c.id}`}
              title={c.title}
              trailing={
                <Badge tone={c.status === "published" ? "green" : "gray"}>
                  {t(`common.${c.status}`)}
                </Badge>
              }
            />
          ))}
        </ListSection>
      )}
    </AdminFrame>
  );
}
