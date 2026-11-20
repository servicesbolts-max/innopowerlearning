"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { cx } from "../../utils/cx";
import { Icon } from "../Icon/Icon";

export interface WizardStepperProps {
  steps: string[];
  /** Zero-based index of the current step. */
  current: number;
  className?: string;
}

/**
 * Progress through a multi-step flow (provisioning wizard, applications). Completed steps show a
 * check, the current step is bold with aria-current="step"; a text summary reads "Step 2 of 4".
 */
export function WizardStepper({ steps, current, className }: WizardStepperProps) {
  const t = useTranslations("ds");
  return (
    <nav
      aria-label={t("stepOf", { current: current + 1, total: steps.length })}
      className={className}
    >
      <p className="mb-3 text-footnote text-label-secondary sm:hidden">
        {t("stepOf", { current: current + 1, total: steps.length })}
      </p>
      <ol className="flex items-center gap-2">
        {steps.map((label, i) => {
          const state = i < current ? "done" : i === current ? "current" : "todo";
          return (
            <li
              key={label}
              aria-current={state === "current" ? "step" : undefined}
              className="flex min-w-0 flex-1 items-center gap-2 last:flex-none"
            >
              <span
                className={cx(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-footnote font-semibold",
                  state === "done" && "bg-accent-fill text-on-accent",
                  state === "current" && "border-2 border-accent-fill text-accent-text",
                  state === "todo" && "border-2 border-control-border text-label-secondary",
                )}
              >
                {state === "done" ? (
                  <Icon icon={Check} size={16} label={t("stepComplete")} />
                ) : (
                  i + 1
                )}
              </span>
              <span
                className={cx(
                  "truncate text-subheadline max-sm:sr-only",
                  state === "current" ? "font-semibold text-label" : "text-label-secondary",
                )}
              >
                {label}
              </span>
              {i < steps.length - 1 && (
                <span
                  aria-hidden
                  className={cx(
                    "h-0.5 min-w-4 flex-1 rounded-full",
                    i < current ? "bg-accent-fill" : "bg-separator",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
