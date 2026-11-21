"use client";

import { KeyRound, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import QRCode from "qrcode";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Banner, Button, Card, Icon, TextField } from "@/design-system";
import { authClient, authErrorCode } from "@/lib/auth-client";
import { useAuthErrorMessage } from "../../../../../_components/auth-errors";

type Setup =
  | { stage: "idle" }
  | { stage: "password" }
  | { stage: "scan"; qr: string; secret: string; backupCodes: string[] }
  | { stage: "codes"; backupCodes: string[] };

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
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const passkeys = authClient.useListPasskeys();
  const router = useRouter();

  const fail = (e: { code?: string; message?: string }) => setError(errorMessage(authErrorCode(e)));

  const onEnable = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await authClient.twoFactor.enable({ password });
    setPending(false);
    setPassword("");
    if (res.error || !res.data || res.data.method !== "totp") return fail(res.error ?? {});
    const uri = res.data.totpURI;
    const secret = new URL(uri).searchParams.get("secret") ?? "";
    const qr = await QRCode.toDataURL(uri, { margin: 1, width: 192 });
    setSetup({ stage: "scan", qr, secret, backupCodes: res.data.backupCodes });
  };

  const onVerify = async (e: FormEvent) => {
    e.preventDefault();
    if (setup.stage !== "scan") return;
    setPending(true);
    setError(null);
    const res = await authClient.twoFactor.verifyTotp({ code: code.trim() });
    setPending(false);
    if (res.error) return fail(res.error);
    setSetup({ stage: "codes", backupCodes: setup.backupCodes });
  };

  const onDisable = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    const res = await authClient.twoFactor.disable({ password });
    setPending(false);
    if (res.error) return fail(res.error);
    window.location.reload();
  };

  const onAddPasskey = async () => {
    setError(null);
    const res = await authClient.passkey.addPasskey();
    if (res?.error) return fail(res.error);
    setNotice(t("security.passkeyAdded"));
    passkeys.refetch();
  };

  const onRemovePasskey = async (id: string) => {
    const res = await authClient.passkey.deletePasskey({ id });
    if (res.error) return fail(res.error);
    passkeys.refetch();
  };

  const onSignOut = async () => {
    await authClient.signOut();
    router.replace("/");
    router.refresh();
  };

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
                value={password}
                onChange={setPassword}
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
                {t("security.manualKey")}:{" "}
                <code className="font-mono break-all text-label" data-testid="totp-secret">
                  {setup.secret}
                </code>
              </p>
              <TextField
                label={t("twoFactor.code")}
                name="code"
                value={code}
                onChange={setCode}
                autoComplete="one-time-code"
                inputMode="numeric"
                isRequired
              />
              <Button type="submit" isPending={pending}>
                {t("security.verify")}
              </Button>
            </form>
          )}

          {setup.stage === "codes" && (
            <div className="flex flex-col gap-3">
              <h3 className="text-subheadline font-semibold">{t("security.backupHeading")}</h3>
              <p className="text-footnote text-label-secondary">{t("security.backupHelp")}</p>
              <ul className="grid grid-cols-2 gap-1 font-mono text-subheadline">
                {setup.backupCodes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <Button onPress={() => window.location.reload()}>{t("security.done")}</Button>
            </div>
          )}

          {twoFactorEnabled && (
            <form method="post" onSubmit={onDisable} className="flex flex-col gap-3" noValidate>
              <TextField
                label={t("security.confirmPassword")}
                type="password"
                name="password"
                value={password}
                onChange={setPassword}
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
          {(passkeys.data ?? []).length === 0 ? (
            <p className="text-subheadline">{t("security.passkeysNone")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {(passkeys.data ?? []).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3">
                  <span className="text-subheadline">{p.name ?? p.deviceType}</span>
                  <Button variant="plain" destructive onPress={() => onRemovePasskey(p.id)}>
                    {t("security.removePasskey")}
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <Button variant="tinted" onPress={onAddPasskey}>
            {t("security.addPasskey")}
          </Button>
        </div>
      </Card>

      <Button variant="gray" onPress={onSignOut}>
        {t("security.signOut")}
      </Button>
    </div>
  );
}
