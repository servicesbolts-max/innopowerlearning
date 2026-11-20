"use client";

import type { ReactNode } from "react";
import { I18nProvider } from "react-aria-components";

/**
 * Pins React Aria's locale (date order, number format, RTL) to the app locale, so server and
 * client render the same thing. Without it React Aria reads the browser locale.
 */
export function DsProvider({ locale, children }: { locale: string; children: ReactNode }) {
  return <I18nProvider locale={locale}>{children}</I18nProvider>;
}
