import { createTranslator } from "next-intl";
import messages from "@/i18n/messages/en.json";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { PRODUCT_NAME } from "@/lib/config";
import { actionEmail, sendMail } from "@/modules/notifications";
import { loadTenantShellById, TENANT_ID_HEADER } from "@/modules/tenancy";
import { INVITE_TTL_DAYS } from "./invitations";

/** Auth emails. Copy lives in messages/en.json ("email"); one clear action per email. */
const t = createTranslator({ locale: DEFAULT_LOCALE, messages, namespace: "email" });

async function orgName(tenantId: string | null): Promise<string> {
  if (!tenantId) return PRODUCT_NAME;
  return (await loadTenantShellById(tenantId))?.name ?? PRODUCT_NAME;
}

/** Better Auth's magic-link callback. The URL already points at the requesting host. */
export async function sendMagicLinkEmail(
  data: { email: string; url: string },
  ctx?: { headers?: Headers | undefined; request?: Request | undefined },
): Promise<void> {
  const tenantId =
    ctx?.headers?.get(TENANT_ID_HEADER) ?? ctx?.request?.headers.get(TENANT_ID_HEADER) ?? null;
  const org = await orgName(tenantId);
  await sendMail({
    to: data.email,
    subject: t("magicLink.subject", { org }),
    ...actionEmail({
      heading: t("magicLink.heading", { org }),
      body: t("magicLink.body"),
      action: t("magicLink.action"),
      url: data.url,
      footer: t("magicLink.footer"),
    }),
  });
}

export async function sendInvitationEmail(input: {
  email: string;
  tenantId: string;
  url: string;
}): Promise<void> {
  const org = await orgName(input.tenantId);
  await sendMail({
    to: input.email,
    subject: t("invitation.subject", { org }),
    ...actionEmail({
      heading: t("invitation.heading", { org }),
      body: t("invitation.body", { org, product: PRODUCT_NAME, days: INVITE_TTL_DAYS }),
      action: t("invitation.action"),
      url: input.url,
      footer: t("invitation.footer"),
    }),
  });
}
