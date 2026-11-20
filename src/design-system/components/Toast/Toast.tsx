"use client";

import { CircleAlert, CircleCheck, Info, TriangleAlert, X, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import {
  Button as AriaButton,
  Text,
  UNSTABLE_Toast as AriaToast,
  UNSTABLE_ToastContent as ToastContent,
  UNSTABLE_ToastQueue as ToastQueue,
  UNSTABLE_ToastRegion as AriaToastRegion,
} from "react-aria-components";
import { cx } from "../../utils/cx";
import { Icon } from "../Icon/Icon";

/*
 * React Aria's toast API is still marked UNSTABLE_. It is wrapped here so a rename touches one file.
 */

export type ToastTone = "neutral" | "success" | "danger";

export interface ToastContentValue {
  title: string;
  description?: string;
  tone?: ToastTone;
  /** Undo for reversible actions (Section 7.6): label plus handler. */
  action?: { label: string; onAction: () => void };
}

/** App-wide toast queue. Call `toast.add({...}, { timeout: 5000 })` from anywhere on the client. */
export const toast = new ToastQueue<ToastContentValue>({ maxVisibleToasts: 3 });

const TOAST_ICON: Record<ToastTone, LucideIcon> = {
  neutral: Info,
  success: CircleCheck,
  danger: CircleAlert,
};

/** Place once near the root. It is an F6-reachable landmark and announces new toasts politely. */
export function ToastRegion({ queue = toast }: { queue?: ToastQueue<ToastContentValue> }) {
  const t = useTranslations("ds");
  return (
    <AriaToastRegion
      queue={queue}
      aria-label={t("notifications")}
      className="fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 pb-[max(--spacing(4),env(safe-area-inset-bottom))] outline-none md:items-end"
    >
      {({ toast: item }) => {
        const tone = item.content.tone ?? "neutral";
        return (
          <AriaToast
            toast={item}
            className="flex w-full max-w-sm items-start gap-3 rounded-card border border-separator bg-bg-tertiary p-3 text-label shadow-elevated focus-ring data-entering:animate-pop-in data-exiting:animate-fade-out forced-colors:border-[CanvasText]"
          >
            <Icon
              icon={TOAST_ICON[tone]}
              size={20}
              className={cx(
                "mt-0.5",
                tone === "success"
                  ? "text-green-text"
                  : tone === "danger"
                    ? "text-red-text"
                    : "text-label-secondary",
              )}
            />
            <ToastContent className="flex min-w-0 flex-1 flex-col">
              <Text slot="title" className="text-subheadline font-semibold">
                {item.content.title}
              </Text>
              {item.content.description && (
                <Text slot="description" className="text-footnote text-label">
                  {item.content.description}
                </Text>
              )}
            </ToastContent>
            {item.content.action && (
              <AriaButton
                onPress={() => {
                  item.content.action!.onAction();
                  queue.close(item.key);
                }}
                className="min-h-8 shrink-0 cursor-pointer rounded-control px-2 text-subheadline font-semibold text-accent-text focus-ring data-hovered:bg-fill"
              >
                {item.content.action.label}
              </AriaButton>
            )}
            <AriaButton
              slot="close"
              aria-label={t("dismiss")}
              className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-label-secondary focus-ring data-hovered:bg-fill"
            >
              <Icon icon={X} size={16} />
            </AriaButton>
          </AriaToast>
        );
      }}
    </AriaToastRegion>
  );
}

export type BannerTone = "info" | "success" | "warning" | "danger";

const BANNER: Record<
  BannerTone,
  { icon: LucideIcon; className: string; role: "status" | "alert" }
> = {
  info: { icon: Info, className: "bg-accent-tint text-accent-text-on-tint", role: "status" },
  success: {
    icon: CircleCheck,
    className: "bg-green-tint text-green-text-on-tint",
    role: "status",
  },
  warning: {
    icon: TriangleAlert,
    className: "bg-orange-tint text-orange-text-on-tint",
    role: "status",
  },
  danger: { icon: CircleAlert, className: "bg-red-tint text-red-text-on-tint", role: "alert" },
};

export interface BannerProps {
  tone?: BannerTone;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  onDismiss?: () => void;
  className?: string;
}

/** Inline banner for page-level status. Danger banners interrupt (role alert); others are polite. */
export function Banner({
  tone = "info",
  title,
  children,
  action,
  onDismiss,
  className,
}: BannerProps) {
  const t = useTranslations("ds");
  const spec = BANNER[tone];
  return (
    <div
      role={spec.role}
      className={cx(
        "flex items-start gap-3 rounded-card p-4 forced-colors:border",
        spec.className,
        className,
      )}
    >
      <Icon icon={spec.icon} size={20} className="mt-0.5" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-subheadline font-semibold">{title}</p>
        {children && <div className="text-subheadline">{children}</div>}
        {action && <div className="mt-2">{action}</div>}
      </div>
      {onDismiss && (
        <AriaButton
          onPress={onDismiss}
          aria-label={t("dismiss")}
          className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full focus-ring data-hovered:bg-fill"
        >
          <Icon icon={X} size={16} />
        </AriaButton>
      )}
    </div>
  );
}
