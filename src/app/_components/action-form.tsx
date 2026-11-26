"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { Banner, cx, useToast } from "@/design-system";
import type { ActionResult } from "@/modules/auth";

type Action = (raw: unknown) => Promise<ActionResult<unknown>>;

/** The submitted form as a plain object; repeated names become arrays. */
export function formObject(form: HTMLFormElement): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of new FormData(form).entries()) {
    if (typeof value !== "string") continue;
    const prev = out[key];
    out[key] = prev === undefined ? value : Array.isArray(prev) ? [...prev, value] : [prev, value];
  }
  return out;
}

/** Shows an action's failure as a translated message. */
export function useActionErrorMessage() {
  const t = useTranslations("lms.errors");
  return (result: Extract<ActionResult<unknown>, { ok: false }>) =>
    t.has(result.error) ? t(result.error) : t("generic");
}

const LAYOUT = {
  stack: "flex flex-col gap-3",
  inline: "flex flex-row flex-wrap items-end gap-2",
  responsive: "flex flex-col gap-3 sm:flex-row sm:items-end",
};

/**
 * A form that calls a `defineAction` server action with its fields, then refreshes the page (or
 * navigates to `redirectTo`, where `{id}` is replaced by the result's id). Errors are announced
 * in a banner; success optionally in a toast.
 */
export function ActionForm({
  action,
  children,
  redirectTo,
  successMessage,
  resetOnSuccess,
  className,
  confirm,
  layout = "stack",
}: {
  action: Action;
  children: ReactNode;
  redirectTo?: string;
  successMessage?: string;
  resetOnSuccess?: boolean;
  className?: string;
  /** Asked with window.confirm before a destructive submit. */
  confirm?: string;
  /** stack: fields in a column; inline: one row; responsive: a column, one row from sm. */
  layout?: "stack" | "inline" | "responsive";
}) {
  const router = useRouter();
  const toast = useToast();
  const message = useActionErrorMessage();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    if (confirm && !window.confirm(confirm)) return;
    const form = e.currentTarget;
    const values = formObject(form);
    setError(null);
    startTransition(async () => {
      const result = await action(values);
      if (!result.ok) {
        setError(message(result));
        return;
      }
      if (resetOnSuccess) form.reset();
      if (successMessage) toast.add({ title: successMessage, tone: "success" });
      const data = result.data as { id?: string } | null | undefined;
      if (redirectTo) router.push(redirectTo.replace("{id}", data?.id ?? ""));
      else router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} aria-busy={pending} className={cx(LAYOUT[layout], className)}>
      {error && <Banner tone="danger" title={error} />}
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
    </form>
  );
}
