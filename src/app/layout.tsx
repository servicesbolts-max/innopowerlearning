import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { DsProvider } from "@/design-system";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { PRODUCT_NAME } from "@/lib/config";
import { buildTheme, DEFAULT_THEME, themeToCss } from "@/lib/theme";
import { inter } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: PRODUCT_NAME,
  description: `${PRODUCT_NAME}: learning spaces for Innopower AI and its partners.`,
};

// Platform default theme. P2 replaces this with the resolved tenant's theme, cached by tenant tag.
// The CSS comes only from the theme engine, which emits validated `--name:value;` pairs.
const defaultThemeCss = themeToCss(buildTheme(DEFAULT_THEME));

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang={DEFAULT_LOCALE} className={inter.variable}>
      <head>
        <style id="theme" dangerouslySetInnerHTML={{ __html: defaultThemeCss }} />
      </head>
      <body className="antialiased">
        <NextIntlClientProvider>
          <DsProvider locale={DEFAULT_LOCALE}>{children}</DsProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
