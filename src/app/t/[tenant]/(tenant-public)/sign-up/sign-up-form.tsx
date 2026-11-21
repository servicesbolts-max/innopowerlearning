"use client";

import NextLink from "next/link";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Banner, Button, TextField, useIsClient } from "@/design-system";
import { authClient, authErrorCode } from "@/lib/auth-client";
import { safeNext, useAuthErrorMessage } from "../../../../_components/auth-errors";

/** Fills in the invited address from ?email= (an invitation link lands here). */
export function SignUpFromQuery({ org }: { org: string }) {
  const email = useSearchParams().get("email") ?? "";
  return <SignUpForm key={email} org={org} initialEmail={email} />;
}

export function SignUpForm({ org, initialEmail = "" }: { org: string; initialEmail?: string }) {
  const t = useTranslations("auth");
  const ready = useIsClient();
  const errorMessage = useAuthErrorMessage(org);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    setPending(true);
    setError(null);
    const res = await authClient.signUp.email({ name, email, password, callbackURL: safeNext() });
    setPending(false);
    if (res.error) {
      setError(errorMessage(authErrorCode(res.error)));
      return;
    }
    // Verification is required: no session yet, the email carries the link that signs them in.
    if (!(res.data as { token?: string | null } | null)?.token) {
      setSentTo(email);
      return;
    }
    window.location.assign(safeNext());
  };

  if (sentTo) {
    return <Banner tone="success" title={t("signUp.checkEmail", { email: sentTo })} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <form method="post" onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {error && <Banner tone="danger" title={error} />}
        <TextField
          isDisabled={!ready}
          label={t("name")}
          name="name"
          autoComplete="name"
          isRequired
        />
        <TextField
          isDisabled={!ready}
          label={t("email")}
          name="email"
          type="email"
          defaultValue={initialEmail}
          autoComplete="email"
          isRequired
        />
        <TextField
          isDisabled={!ready}
          label={t("password")}
          name="password"
          type="password"
          autoComplete="new-password"
          description={t("signUp.passwordHelp")}
          minLength={10}
          isRequired
        />
        <Button type="submit" isPending={pending} isDisabled={!ready} fullWidth>
          {t("signUp.submit")}
        </Button>
      </form>
      <p className="text-subheadline text-label-secondary">
        {t("signUp.haveAccount")}{" "}
        <NextLink
          href="/sign-in"
          className="rounded-control text-accent-text underline underline-offset-2 focus-ring"
        >
          {t("signIn.submit")}
        </NextLink>
      </p>
    </div>
  );
}
