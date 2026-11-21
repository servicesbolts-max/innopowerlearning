import type { ReactNode } from "react";

/** A narrow, centered column for sign-in style pages: one heading, then the form. */
export function AuthCard({
  heading,
  intro,
  children,
}: {
  heading: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6 px-4 py-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-title1 tracking-tight">{heading}</h1>
        {intro && <div className="text-body text-label-secondary">{intro}</div>}
      </div>
      {children}
    </div>
  );
}
