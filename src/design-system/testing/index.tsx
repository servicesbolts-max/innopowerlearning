/**
 * Test helpers for design-system components (Vitest + jsdom). Not exported from the public index.
 */
import { cleanup, render, type RenderOptions } from "@testing-library/react";
import axe from "axe-core";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement, ReactNode } from "react";
import { afterEach, expect } from "vitest";
import messages from "@/i18n/messages/en.json";

function Providers({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" timeZone="UTC" messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}

// No Vitest globals, so Testing Library cannot register its own cleanup.
afterEach(cleanup);

export function renderDs(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return render(ui, { wrapper: Providers, ...options });
}

/**
 * Run axe on the rendered document. jsdom cannot compute color, so contrast is checked by the
 * theme engine tests and by Playwright axe on /design instead. `region` is off because isolated
 * components are not inside landmarks.
 */
export async function expectNoAxeViolations(root: Element | Document = document) {
  // Document-level rules belong to the app shell, not to a component under test.
  document.documentElement.lang ||= "en";
  document.title ||= "Component test";
  const result = await axe.run(root, {
    rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
  });
  const summary = result.violations.map(
    (v) => `${v.id}: ${v.help} -> ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
  );
  expect(summary).toEqual([]);
}
