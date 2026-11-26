import { BookOpen } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Badge, Card, EmptyState, ListRow, ListSection } from "@/design-system";
import { listAllCourses } from "@/modules/courses";
import { can } from "@/modules/rbac";
import { staffPage } from "../../../../../_lib/guard";
import { AdminFrame } from "../_components/admin-frame";
import { CourseFields } from "./course-fields";
import { ActionForm } from "../../../../../_components/action-form";
import { createCourseAction } from "./actions";
import { Button } from "@/design-system";

export const instant = false;

type Props = { params: Promise<{ tenant: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("lms.authoring");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function AdminCoursesPage({ params }: Props) {
  const { shell, session } = await staffPage(
    (await params).tenant,
    "course.create",
    "/admin/courses",
  );
  const t = await getTranslations("lms");
  const { actor } = session;
  // Tenant-wide editors see every course; instructors see the courses they own.
  const list = await listAllCourses(
    shell.id,
    can(actor, "course.edit", { ownerId: null }) ? undefined : actor.userId,
  );

  return (
    <AdminFrame actor={actor} current="courses" title={t("authoring.title")}>
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div>
          {list.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title={t("authoring.empty")}
              description={t("authoring.emptyBody")}
              headingLevel="h2"
            />
          ) : (
            <ListSection>
              {list.map((c) => (
                <ListRow
                  key={c.id}
                  href={`/admin/courses/${c.id}`}
                  icon={BookOpen}
                  title={c.title}
                  subtitle={c.category ?? undefined}
                  trailing={
                    <Badge tone={c.status === "published" ? "green" : "gray"}>
                      {t(`common.${c.status}`)}
                    </Badge>
                  }
                />
              ))}
            </ListSection>
          )}
        </div>
        <Card as="section" className="flex flex-col gap-3">
          <h2 className="text-title3">{t("authoring.new")}</h2>
          <ActionForm action={createCourseAction} redirectTo="/admin/courses/{id}">
            <CourseFields />
            <Button type="submit">{t("authoring.create")}</Button>
          </ActionForm>
        </Card>
      </div>
    </AdminFrame>
  );
}
