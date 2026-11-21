"use client";

import NextLink from "next/link";
import { useSelectedLayoutSegments } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { Avatar, Banner, Button, cx } from "@/design-system";
import { authClient } from "@/lib/auth-client";

/**
 * The account entry at the end of the tenant header: "Sign in" for visitors, the person's avatar
 * and name (linking to account security) once signed in. Read in the browser so tenant pages
 * stay prerendered; the server re-checks the session on every protected page.
 */
export function AccountNav() {
  const t = useTranslations("auth.account");
  const { data, isPending } = authClient.useSession();
  const current = useSelectedLayoutSegments().filter((s) => !s.startsWith("("))[0];

  if (isPending || !data) {
    const active = current === "sign-in";
    return (
      <NextLink
        href="/sign-in"
        aria-current={active ? "page" : undefined}
        className={cx(
          "flex min-h-touch items-center rounded-control px-2 text-subheadline font-semibold text-accent-text underline-offset-4 focus-ring",
          active && "underline decoration-2",
        )}
      >
        {t("signIn")}
      </NextLink>
    );
  }
  return (
    <NextLink
      href="/account/security"
      aria-current={current === "account" ? "page" : undefined}
      className="flex min-h-touch items-center gap-2 rounded-control px-2 text-subheadline focus-ring"
    >
      <Avatar name={data.user.name} size={32} decorative />
      {/* The visible name is part of the accessible name (WCAG 2.5.3); the prefix is for AT. */}
      <span className="max-w-32 truncate max-sm:sr-only">
        <span className="sr-only">{t("prefix")}</span>
        {data.user.name}
      </span>
    </NextLink>
  );
}

/** Persistent banner while a platform owner views as this user (Section 6.3). */
export function ImpersonationBanner() {
  const t = useTranslations("auth.impersonation");
  const format = useFormatter();
  const { data } = authClient.useSession();
  const session = data?.session as
    { impersonatedBy?: string | null; impersonationExpiresAt?: string | Date | null } | undefined;
  if (!data || !session?.impersonatedBy) return null;
  const ends = session.impersonationExpiresAt ? new Date(session.impersonationExpiresAt) : null;
  const stop = async () => {
    await authClient.$fetch("/impersonation/stop", { method: "POST" });
    window.location.reload();
  };
  return (
    <div className="mx-auto w-full max-w-app px-4 pt-3">
      <Banner
        tone="warning"
        title={t("banner", {
          name: data.user.name,
          time: ends ? format.dateTime(ends, { timeStyle: "short" }) : "",
        })}
        action={
          <Button size="small" variant="gray" onPress={stop}>
            {t("stop")}
          </Button>
        }
      />
    </div>
  );
}
