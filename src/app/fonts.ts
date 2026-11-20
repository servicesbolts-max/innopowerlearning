import localFont from "next/font/local";

/** Self-hosted Inter (variable, latin subset), the cross-platform fallback in Section 7.1. */
export const inter = localFont({
  src: "../design-system/fonts/inter-latin-wght-normal.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
  preload: true,
});
