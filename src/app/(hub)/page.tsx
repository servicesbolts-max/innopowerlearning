import { PLATFORM_OWNER, PRODUCT_NAME } from "@/lib/config";

// P0 placeholder for the Innopower Hub. Strings move to src/i18n in P1/P2.
export default function HubHome() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[680px] flex-col justify-center gap-4 px-6 py-16">
      <h1 className="text-[34px] leading-[41px] font-bold tracking-tight">{PRODUCT_NAME}</h1>
      <p className="text-[17px] leading-[22px] text-label">
        Learning spaces for {PLATFORM_OWNER} and its partners. The platform is being built.
      </p>
      <p className="text-[15px] leading-5">
        <a className="text-accent-text underline-offset-2 hover:underline" href="/api/health">
          Service status
        </a>
      </p>
    </main>
  );
}
