import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Button, Card, TextField } from "@/design-system";
import { getBranding } from "@/modules/tenancy";
import { ActionForm } from "../../../../../_components/action-form";
import { staffPage } from "../../../../../_lib/guard";
import { AdminFrame } from "../_components/admin-frame";
import { saveBrandingAction } from "./actions";

export const instant = false;

type Props = { params: Promise<{ tenant: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("lms.admin.branding");
  return { title: t("title"), robots: { index: false, follow: false } };
}

/** Branding (MVP slice M6): name, tagline, accent colour through the theme engine, logo URL. */
export default async function BrandingPage({ params }: Props) {
  const { shell, session } = await staffPage(
    (await params).tenant,
    "tenant.settings.write",
    "/admin/branding",
  );
  const branding = await getBranding(shell.id);
  if (!branding) notFound();
  const t = await getTranslations("lms");

  return (
    <AdminFrame actor={session.actor} current="branding" title={t("admin.branding.title")}>
      <Card as="section" className="max-w-reading">
        <ActionForm action={saveBrandingAction} successMessage={t("admin.branding.saved")}>
          <TextField
            name="name"
            label={t("admin.branding.name")}
            defaultValue={branding.name}
            isRequired
            minLength={2}
            maxLength={120}
          />
          <TextField
            name="tagline"
            label={t("admin.branding.tagline")}
            defaultValue={branding.tagline}
            maxLength={200}
          />
          <TextField
            name="accent"
            label={t("admin.branding.accent")}
            description={t("admin.branding.accentHelp")}
            defaultValue={branding.accent}
            isRequired
            pattern="#[0-9a-fA-F]{6}"
            maxLength={7}
          />
          <TextField
            name="logoUrl"
            type="url"
            label={t("admin.branding.logoUrl")}
            description={t("admin.branding.logoUrlHelp")}
            defaultValue={branding.logoUrl ?? ""}
            maxLength={500}
          />
          <TextField
            name="logoAlt"
            label={t("admin.branding.logoAlt")}
            defaultValue={branding.logoAlt}
            maxLength={120}
          />
          <Button type="submit" className="self-start">
            {t("common.save")}
          </Button>
        </ActionForm>
      </Card>
    </AdminFrame>
  );
}
