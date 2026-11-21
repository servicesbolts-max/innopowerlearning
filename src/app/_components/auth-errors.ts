"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";

/** Turns a Better Auth or admission error code into a translated sentence. */
export function useAuthErrorMessage(org: string) {
  const t = useTranslations("auth.errors");
  return useCallback(
    (code: string | null | undefined) => {
      const key = code && t.has(code) ? code : "generic";
      return t(key as "generic", { org });
    },
    [t, org],
  );
}

/** A same-site path to continue to after signing in (never another host). */
export function safeNext(fallback = "/"): string {
  if (typeof window === "undefined") return fallback;
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\")
    ? next
    : fallback;
}
