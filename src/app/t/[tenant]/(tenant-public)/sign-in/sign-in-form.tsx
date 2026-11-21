"use client";

import { KeyRound, Mail } from "lucide-react";
import NextLink from "next/link";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Banner, Button, Icon, TextField, useIsClient } from "@/design-system";
import { authClient, authErrorCode } from "@/lib/auth-client";
import { safeNext, useAuthErrorMessage } from "../../../../_components/auth-errors";

type Step = "password" | "totp" | "backup";

type FormProps = {
  org: string;
  ssoOnly: boolean;
  providers: { google: boolean; microsoft: boolean };
  initialError?: string | null;
};

/** Shows an error code passed back in ?error= (a refused magic link, for example). */
export function SignInFromQuery(props: Omit<FormProps, "initialError">) {
  const code = useSearchParams().get("error");
  return <SignInForm key={code ?? ""} {...props} initialError={code} />;
}

export function SignInForm({ org, ssoOnly, providers, initialError }: FormProps) {
  const t = useTranslations("auth");
  const ready = useIsClient();
  const errorMessage = useAuthErrorMessage(org);
  const [step, setStep] = useState<Step>("password");
  const formRef = useRef<HTMLFormElement>(null);
  const field = (form: HTMLFormElement | null, name: string) =>
    form ? String(new FormData(form).get(name) ?? "").trim() : "";
  const [error, setError] = useState<string | null>(
    initialError ? errorMessage(initialError) : null,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const finish = () => window.location.assign(safeNext());

  async function run(
    task: () => Promise<{ error?: { code?: string; message?: string } | null } | void>,
  ) {
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      const result = await task();
      if (result && result.error) setError(errorMessage(authErrorCode(result.error)));
    } finally {
      setPending(false);
    }
  }

  const onPassword = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = field(e.currentTarget, "email");
    const password = String(new FormData(e.currentTarget).get("password") ?? "");
    void run(async () => {
      const res = await authClient.signIn.email({ email, password });
      if (res.error) return res;
      if ((res.data as { twoFactorRedirect?: boolean } | null)?.twoFactorRedirect) {
        setStep("totp");
        return;
      }
      finish();
    });
  };

  const onCode = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const code = field(e.currentTarget, "code");
    void run(async () => {
      const res =
        step === "totp"
          ? await authClient.twoFactor.verifyTotp({ code })
          : await authClient.twoFactor.verifyBackupCode({ code });
      if (res.error) return res;
      finish();
    });
  };

  const onMagicLink = () =>
    run(async () => {
      const email = field(formRef.current, "email");
      if (!email) {
        setError(errorMessage("INVALID_EMAIL"));
        return;
      }
      const res = await authClient.signIn.magicLink({ email, callbackURL: safeNext() });
      if (res.error) return res;
      setNotice(t("signIn.magicLinkSent", { email }));
    });

  const onPasskey = () =>
    run(async () => {
      const res = await authClient.signIn.passkey();
      if (res?.error) return res;
      finish();
    });

  const onSocial = (provider: "google" | "microsoft") =>
    run(() => authClient.signIn.social({ provider, callbackURL: safeNext() }));

  const feedback = (
    <>
      {error && <Banner tone="danger" title={error} />}
      {notice && <Banner tone="success" title={notice} />}
    </>
  );

  if (step !== "password") {
    return (
      <form method="post" onSubmit={onCode} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1">
          <h2 className="text-headline">{t("twoFactor.heading")}</h2>
          <p className="text-subheadline text-label-secondary">
            {step === "totp" ? t("twoFactor.help", { org }) : t("twoFactor.backupHelp")}
          </p>
        </div>
        {feedback}
        <TextField
          // A new field per step, so focus moves to it when the step changes (WCAG 2.4.3).
          key={step}
          isDisabled={!ready}
          label={step === "totp" ? t("twoFactor.code") : t("twoFactor.backupCode")}
          name="code"
          autoComplete="one-time-code"
          inputMode={step === "totp" ? "numeric" : "text"}
          isRequired
          autoFocus
        />
        <Button type="submit" isPending={pending} isDisabled={!ready} fullWidth>
          {t("twoFactor.submit")}
        </Button>
        <Button variant="plain" onPress={() => setStep(step === "totp" ? "backup" : "totp")}>
          {step === "totp" ? t("twoFactor.useBackup") : t("twoFactor.useTotp")}
        </Button>
      </form>
    );
  }

  const social = (providers.google || providers.microsoft) && (
    <div className="flex flex-col gap-2">
      {providers.google && (
        <Button variant="gray" fullWidth onPress={() => onSocial("google")}>
          {t("signIn.google")}
        </Button>
      )}
      {providers.microsoft && (
        <Button variant="gray" fullWidth onPress={() => onSocial("microsoft")}>
          {t("signIn.microsoft")}
        </Button>
      )}
    </div>
  );

  if (ssoOnly) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-body text-label-secondary">{t("signIn.ssoOnly", { org })}</p>
        {feedback}
        {social}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        method="post"
        ref={formRef}
        onSubmit={onPassword}
        className="flex flex-col gap-4"
        noValidate
      >
        {feedback}
        <TextField
          isDisabled={!ready}
          label={t("email")}
          name="email"
          type="email"
          autoComplete="username webauthn"
          isRequired
        />
        <TextField
          isDisabled={!ready}
          label={t("password")}
          name="password"
          type="password"
          autoComplete="current-password"
          isRequired
        />
        <Button type="submit" isPending={pending} isDisabled={!ready} fullWidth>
          {t("signIn.submit")}
        </Button>
      </form>

      <div className="flex items-center gap-3 text-footnote text-label-secondary">
        <span className="flex-1 hairline-b" />
        {t("signIn.or")}
        <span className="flex-1 hairline-b" />
      </div>

      <div className="flex flex-col gap-2">
        <Button variant="gray" fullWidth onPress={onMagicLink} isDisabled={pending || !ready}>
          <Icon icon={Mail} size={20} />
          {t("signIn.magicLink")}
        </Button>
        <Button variant="gray" fullWidth onPress={onPasskey} isDisabled={pending || !ready}>
          <Icon icon={KeyRound} size={20} />
          {t("signIn.passkey")}
        </Button>
      </div>
      {social}

      <p className="text-subheadline text-label-secondary">
        {t("signIn.noAccount")}{" "}
        <NextLink
          href="/sign-up"
          className="rounded-control text-accent-text underline underline-offset-2 focus-ring"
        >
          {t("signIn.createAccount")}
        </NextLink>
      </p>
    </div>
  );
}
