"use client";

import { KeyRound, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import QRCode from "qrcode";
import { useState, type FormEvent } from "react";
import { AlertDialog, Banner, Button, Card, Icon, TextField } from "@/design-system";
import { authClient, authErrorCode } from "@/lib/auth-client";
import { useAuthErrorMessage } from "../../../../../_components/auth-errors";

type Setup =
  | { stage: "idle" }
  | { stage: "password" }
  | { stage: "scan"; qr: string; secret: string; backupCodes: string[] }
  | { stage: "codes"; backupCodes: string[] };

type Passkey = { id: string; name?: string | null; deviceType: string };

/** Reads one field of the submitted form (works for text typed in any order). */
const field = (form: HTMLFormElement, name: string) => String(new FormData(form).get(name) ?? "");

export function SecurityPanel({
  org,
  email,
  twoFactorEnabled,
  required,
}: {
  org: string;
  email: string;
  twoFactorEnabled: boolean;
  required: boolean;
}) {
  const t = useTranslations("auth");
  const errorMessage = useAuthErrorMessage(org);
  const [setup, setSetup] = useState<Setup>({ stage: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [removing, setRemoving] = useState<Passkey | null>(null);
  const passkeys = authClient.useListPasskeys();
  const router = useRouter();

  const fail = (e: { code?: string; message?: string }) => setError(errorMessage(authErrorCode(e)));
  /** Every action starts from a clean slate: no stale error or success message. */
  const begin = () => {
    setError(null);
    setNotice(null);
    setPending(true);
  };

  const passkeyLabel = (p: Passkey) =>
    p.name ||
    (p.deviceType === "multiDevice" ? t("security.deviceMulti") : t("security.deviceSingle"));

  const onEnable = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const password = field(e.currentTarget, "password");
    begin();
    const res = await authClient.twoFactor.enable({ password });
    setPending(false);
    if (res.error || !res.data || res.data.method !== "totp") return fail(res.error ?? {});
    const uri = res.data.totpURI;
    const secret = new URL(uri).searchParams.get("secret") ?? "";
    const qr = await QRCode.toDataURL(uri, { margin: 1, width: 192 });
    setSetup({ stage: "scan", qr, secret, backupCodes: res.data.backupCodes });
  };

  const onVerify = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (setup.stage !== "scan") return;
    const code = field(e.currentTarget, "code").trim();
    begin();
    const res = await authClient.twoFactor.verifyTotp({ code });
    setPending(false);
    if (res.error) return fail(res.error);
    setSetup({ stage: "codes", backupCodes: setup.backupCodes });
  };

  const onDisable = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const password = field(form, "password");
    begin();
    const res = await authClient.twoFactor.disable({ password });
    setPending(false);
    form.reset();
    if (res.error) return fail(res.error);
    router.refresh();
  };

  const onCopyCodes = async (codes: string[]) => {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      setNotice(t("security.codesCopied"));
    } catch {
      // Clipboard blocked (permissions, insecure context): the codes stay visible to copy by hand.
    }
  };

  const onAddPasskey = async () => {
    begin();
    const res = await authClient.passkey.addPasskey();
    setPending(false);
    if (res?.error) return fail(res.error);
    setNotice(t("security.passkeyAdded"));
    passkeys.refetch();
  };

  const onRemovePasskey = async (passkey: Passkey) => {
    begin();
    const res = await authClient.passkey.deletePasskey({ id: passkey.id });
    setPending(false);
    if (res.error) return fail(res.error);
    passkeys.refetch();
  };

  const onSignOut = async () => {
    await authClient.signOut();
    router.replace("/");
    router.refresh();
  };

  const list = (passkeys.data ?? []) as Passkey[];

  return (
    <div className="flex flex-col gap-6">
      <p className="text-body text-label-secondary">{t("security.signedInAs", { email })}</p>
      {required && !twoFactorEnabled && <Banner tone="warning" title={t("security.required")} />}
      {error && <Banner tone="danger" title={error} />}
      {notice && <Banner tone="success" title={notice} />}

      <Card as="section" aria-labelledby="two-factor">
        <div className="flex flex-col gap-4">
          <h2 id="two-factor" className="flex items-center gap-2 text-headline">
            <Icon icon={ShieldCheck} size={20} className="text-accent-text" />
            {t("security.twoFactorHeading")}
          </h2>
          <p className="text-subheadline text-label-secondary">
            {twoFactorEnabled ? t("security.twoFactorOn") : t("security.twoFactorOff")}
          </p>

          {!twoFactorEnabled && setup.stage === "idle" && (
            <Button onPress={() => setSetup({ stage: "password" })}>{t("security.enable")}</Button>
          )}

          {!twoFactorEnabled && setup.stage === "password" && (
            <form method="post" onSubmit={onEnable} className="flex flex-col gap-3" noValidate>
              <TextField
                label={t("security.confirmPassword")}
                type="password"
                name="password"
                autoComplete="current-password"
                isRequired
                autoFocus
              />
              <Button type="submit" isPending={pending}>
                {t("security.enable")}
              </Button>
            </form>
          )}

          {setup.stage === "scan" && (
            <form method="post" onSubmit={onVerify} className="flex flex-col gap-3" noValidate>
              <p className="text-subheadline">{t("security.scan")}</p>
              {/* eslint-disable-next-line @next/next/no-img-element -- a data: URL generated in the browser. */}
              <img
                src={setup.qr}
                alt={t("security.qrAlt")}
                width={192}
                height={192}
                className="rounded-control bg-thumb p-2"
              />
              <p className="text-footnote text-label-secondary">
                {t.rich("security.manualKey", {
                  secret: setup.secret,
                  key: (chunks) => (
                    <code
                      className="font-mono break-all text-label select-all"
                      data-testid="totp-secret"
                    >
                      {chunks}
                    </code>
                  ),
                })}
              </p>
              {/* Focus moves to the code field when this step appears (WCAG 2.4.3). */}
              <TextField
                label={t("twoFactor.code")}
                name="code"
                autoComplete="one-time-code"
                inputMode="numeric"
                isRequired
                autoFocus
              />
              <Button type="submit" isPending={pending}>
                {t("security.verify")}
              </Button>
            </form>
          )}

          {setup.stage === "codes" && (
            <div className="flex flex-col gap-3">
              {/* Focus lands on the heading when the codes appear (WCAG 2.4.3). */}
              <h3 tabIndex={-1} autoFocus className="text-subheadline font-semibold outline-none">
                {t("security.backupHeading")}
              </h3>
              <p className="text-footnote text-label-secondary">{t("security.backupHelp")}</p>
              <ul className="grid grid-cols-2 gap-1 font-mono text-subheadline">
                {setup.backupCodes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <Button variant="gray" onPress={() => onCopyCodes(setup.backupCodes)}>
                {t("security.copyCodes")}
              </Button>
              {/* A full reload: the page shows the new state and the codes leave the screen. */}
              <Button onPress={() => window.location.reload()}>{t("security.done")}</Button>
            </div>
          )}

          {twoFactorEnabled && (
            <form method="post" onSubmit={onDisable} className="flex flex-col gap-3" noValidate>
              <TextField
                label={t("security.confirmPassword")}
                type="password"
                name="password"
                autoComplete="current-password"
                isRequired
              />
              <Button type="submit" variant="gray" destructive isPending={pending}>
                {t("security.disable")}
              </Button>
            </form>
          )}
        </div>
      </Card>

      <Card as="section" aria-labelledby="passkeys">
        <div className="flex flex-col gap-4">
          <h2 id="passkeys" className="flex items-center gap-2 text-headline">
            <Icon icon={KeyRound} size={20} className="text-accent-text" />
            {t("security.passkeysHeading")}
          </h2>
          <p className="text-subheadline text-label-secondary">{t("security.passkeysHelp")}</p>
          {list.length === 0 ? (
            <p className="text-subheadline">{t("security.passkeysNone")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {list.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3">
                  <span className="text-subheadline">{passkeyLabel(p)}</span>
                  <Button
                    variant="plain"
                    destructive
                    isDisabled={pending}
                    aria-label={t("security.removePasskeyNamed", { name: passkeyLabel(p) })}
                    onPress={() => setRemoving(p)}
                  >
                    {t("security.removePasskey")}
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <Button variant="tinted" isPending={pending} onPress={onAddPasskey}>
            {t("security.addPasskey")}
          </Button>
        </div>
      </Card>

      <Button variant="gray" onPress={onSignOut}>
        {t("security.signOut")}
      </Button>

      <AlertDialog
        isOpen={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={t("security.removeConfirmTitle")}
        actionLabel={t("security.removeConfirm")}
        destructive
        onAction={() => {
          if (removing) void onRemovePasskey(removing);
          setRemoving(null);
        }}
      >
        {removing ? t("security.removeConfirmBody", { name: passkeyLabel(removing) }) : null}
      </AlertDialog>
    </div>
  );
}
