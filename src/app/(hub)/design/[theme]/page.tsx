import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { buildTheme, DEMO_THEME_NAMES, DEMO_THEMES, isDemoTheme, themeToCss } from "@/lib/theme";
import { Showcase } from "./showcase";

// The three demo tenant themes are prerendered. Cache Components forbids `dynamicParams`, so any
// other value is rejected with notFound() below.
export function generateStaticParams() {
  return DEMO_THEME_NAMES.map((theme) => ({ theme }));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("design");
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

export default async function DesignPage({ params }: { params: Promise<{ theme: string }> }) {
  const { theme } = await params;
  if (!isDemoTheme(theme)) notFound();
  const built = buildTheme(DEMO_THEMES[theme]);
  return (
    <>
      {/* Engine output only: validated `--name:value;` pairs, overriding the root default theme. */}
      <style dangerouslySetInnerHTML={{ __html: themeToCss(built) }} />
      <Showcase theme={theme} report={built.report} />
    </>
  );
}
