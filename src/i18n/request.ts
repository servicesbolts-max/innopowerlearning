import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE, DEFAULT_TIME_ZONE } from "./config";

// English only for now, with no locale routing. P2 picks the locale and time zone per tenant.
export default getRequestConfig(async () => ({
  locale: DEFAULT_LOCALE,
  timeZone: DEFAULT_TIME_ZONE,
  messages: (await import("./messages/en.json")).default,
}));
