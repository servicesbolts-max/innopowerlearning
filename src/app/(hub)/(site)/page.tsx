import Link from "next/link";
import { useTranslations } from "next-intl";
import { PLATFORM_OWNER, PRODUCT_NAME } from "@/lib/config";

// Placeholder for the Innopower Hub until P2.
export default function HubHome() {
  const t = useTranslations("hub");
  return (
    <main className="mx-auto flex min-h-dvh max-w-reading flex-col justify-center gap-4 px-6 py-16">
      <h1 className="text-large-title tracking-tight">{PRODUCT_NAME}</h1>
      <p className="text-body text-label">{t("tagline", { owner: PLATFORM_OWNER })}</p>
      <p className="flex gap-6 text-subheadline">
        <a className="text-accent-text underline-offset-2 hover:underline" href="/api/health">
          {t("status")}
        </a>
        <Link
          className="text-accent-text underline-offset-2 hover:underline"
          href="/design/innopower"
        >
          {t("designSystem")}
        </Link>
      </p>
    </main>
  );
}
