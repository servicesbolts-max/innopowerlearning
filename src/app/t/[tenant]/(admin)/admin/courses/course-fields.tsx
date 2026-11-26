"use client";

import { useTranslations } from "next-intl";
import { Select, SelectItem, TextArea, TextField } from "@/design-system";

/** Title, summary, category and enrollment mode: shared by the create and edit forms. */
export function CourseFields({
  defaults,
}: {
  defaults?: { title: string; summary: string; category: string | null; enrollmentMode: string };
}) {
  const t = useTranslations("lms");
  return (
    <>
      <TextField
        name="title"
        label={t("authoring.courseTitle")}
        defaultValue={defaults?.title}
        isRequired
        maxLength={160}
      />
      <TextArea
        name="summary"
        label={t("authoring.summary")}
        defaultValue={defaults?.summary}
        maxLength={1000}
        rows={3}
      />
      <TextField
        name="categoryName"
        label={t("authoring.category")}
        description={t("authoring.categoryHelp")}
        defaultValue={defaults?.category ?? ""}
        maxLength={80}
      />
      <Select
        name="enrollmentMode"
        label={t("authoring.enrollment")}
        defaultSelectedKey={defaults?.enrollmentMode ?? "open"}
      >
        <SelectItem id="open">{t("common.open")}</SelectItem>
        <SelectItem id="invite_only">{t("common.inviteOnly")}</SelectItem>
      </Select>
    </>
  );
}
