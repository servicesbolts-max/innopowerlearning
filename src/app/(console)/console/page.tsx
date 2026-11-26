import { Building2 } from "lucide-react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  Badge,
  Button,
  Card,
  ListRow,
  ListSection,
  Select,
  SelectItem,
  TextField,
} from "@/design-system";
import { DEFAULT_THEME } from "@/lib/theme";
import { currentTenantId, getTenantSession } from "@/modules/auth";
import { can } from "@/modules/rbac";
import { listAllPartners } from "@/modules/tenancy";
import { ActionForm } from "../../_components/action-form";
import { tenantUrl } from "../../_lib/tenancy";
import { createPartnerAction } from "./actions";

export const instant = false;

const TENANT_PRESETS = [
  "training_provider",
  "funded_program",
  "university",
  "community_organization",
] as const;
const STATUSES = ["active", "suspended", "archived"] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("lms.console");
  return { title: t("partners") };
}

/** Partners and the create-partner form (MVP slice M7). Platform staff only. */
export default async function ConsolePage() {
  const platformId = await currentTenantId();
  const session = await getTenantSession(platformId);
  if (!session) redirect("/sign-in");
  if (session.needsSecondFactor) redirect("/account/security?required=1");
  if (!can(session.actor, "platform.support.read")) notFound();
  const t = await getTranslations("lms.console");
  const partners = await listAllPartners(platformId);
  const canCreate = can(session.actor, "tenant.provision");

  return (
    <div className="mx-auto flex w-full max-w-app flex-col gap-6 px-4 py-8">
      <h1 className="text-large-title tracking-tight">{t("partners")}</h1>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ListSection>
            {partners.map((p) => (
              <ListRow
                key={p.id}
                href={tenantUrl(p.slug, "/admin")}
                icon={Building2}
                title={p.name}
                subtitle={`${p.slug} · ${t(`presets.${p.preset as (typeof TENANT_PRESETS)[number]}`)}`}
                trailing={
                  <Badge tone={p.status === "active" ? "green" : "gray"}>
                    {STATUSES.includes(p.status as (typeof STATUSES)[number])
                      ? t(`statuses.${p.status as (typeof STATUSES)[number]}`)
                      : p.status}
                  </Badge>
                }
              />
            ))}
          </ListSection>
        </div>
        {canCreate && (
          <Card as="section" className="flex flex-col gap-3 self-start">
            <h2 className="text-title3">{t("create")}</h2>
            <ActionForm action={createPartnerAction} resetOnSuccess successMessage={t("created")}>
              <TextField name="name" label={t("name")} isRequired minLength={2} maxLength={120} />
              <TextField
                name="slug"
                label={t("slug")}
                description={t("slugHelp", { example: tenantUrl("example") })}
                isRequired
                maxLength={40}
                pattern="[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?"
              />
              <Select name="preset" label={t("preset")} defaultSelectedKey="training_provider">
                {TENANT_PRESETS.map((p) => (
                  <SelectItem key={p} id={p}>
                    {t(`presets.${p}`)}
                  </SelectItem>
                ))}
              </Select>
              <TextField
                name="accent"
                label={t("accent")}
                defaultValue={DEFAULT_THEME.accent}
                isRequired
                pattern="#[0-9a-fA-F]{6}"
                maxLength={7}
              />
              <TextField
                name="adminEmail"
                type="email"
                label={t("adminEmail")}
                isRequired
                maxLength={320}
              />
              <Button type="submit">{t("submit")}</Button>
            </ActionForm>
          </Card>
        )}
      </div>
    </div>
  );
}
