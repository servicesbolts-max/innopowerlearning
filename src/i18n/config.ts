export const DEFAULT_LOCALE = "en";
export const LOCALES = [DEFAULT_LOCALE] as const;
export type Locale = (typeof LOCALES)[number];

/** Explicit so server and client agree; never the build machine's zone. */
export const DEFAULT_TIME_ZONE = "UTC";
