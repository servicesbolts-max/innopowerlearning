"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import {
  Button as AriaButton,
  Dialog,
  Heading,
  Modal,
  ModalOverlay,
  type ModalOverlayProps,
} from "react-aria-components";
import { cx } from "../../utils/cx";
import { Button } from "../Button/Button";
import { Icon } from "../Icon/Icon";

const overlay = cx(
  "fixed inset-0 z-50 flex items-end justify-center bg-scrim md:items-center md:p-6",
  "data-entering:animate-fade-in data-exiting:animate-fade-out",
);

export interface SheetProps extends Omit<ModalOverlayProps, "children"> {
  title: ReactNode;
  children: ReactNode;
  /** Footer actions (for example Cancel and Save). */
  footer?: ReactNode;
  /** Width on desktop. */
  size?: "medium" | "large";
}

/**
 * Sheet for create and edit flows (Section 7.6): a bottom sheet with a grabber on phones, a centered
 * dialog from 768 px. Escape or the close button dismisses it; focus is trapped while open.
 * The surface is opaque: text never sits on blur here.
 */
export function Sheet({
  title,
  children,
  footer,
  size = "medium",
  isDismissable = true,
  ...props
}: SheetProps) {
  const t = useTranslations("ds");
  return (
    <ModalOverlay {...props} isDismissable={isDismissable} className={overlay}>
      <Modal
        className={cx(
          "flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-sheet bg-bg-grouped text-label shadow-elevated md:rounded-sheet",
          size === "large" ? "md:max-w-3xl" : "md:max-w-lg",
          "data-entering:animate-sheet-up data-exiting:animate-sheet-down md:data-entering:animate-pop-in md:data-exiting:animate-fade-out",
          "forced-colors:border",
        )}
      >
        <Dialog className="flex min-h-0 flex-1 flex-col outline-none">
          {({ close }) => (
            <>
              <div
                aria-hidden
                className="mx-auto mt-2 h-1.25 w-9 shrink-0 rounded-full bg-control-border md:hidden"
              />
              <div className="flex items-center justify-between gap-3 px-5 pt-3 pb-2 md:pt-5">
                <Heading slot="title" className="text-title3">
                  {title}
                </Heading>
                <AriaButton
                  onPress={close}
                  aria-label={t("close")}
                  className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-label-secondary focus-ring data-hovered:bg-fill"
                >
                  <span className="flex size-7.5 items-center justify-center rounded-full bg-fill">
                    <Icon icon={X} size={16} />
                  </span>
                </AriaButton>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
              {footer && (
                <div className="flex flex-col-reverse gap-2 hairline-t bg-bg-grouped px-5 py-3 pb-[max(--spacing(3),env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">
                  {footer}
                </div>
              )}
            </>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

export interface AlertDialogProps extends Omit<ModalOverlayProps, "children"> {
  title: ReactNode;
  children: ReactNode;
  /** Label of the confirming action, a verb ("Delete course"). */
  actionLabel: string;
  onAction: () => void;
  destructive?: boolean;
  cancelLabel?: string;
}

/**
 * Alert dialog for destructive or irreversible confirmations, with stacked full-width buttons.
 * It cannot be dismissed by tapping outside; Escape cancels.
 */
export function AlertDialog({
  title,
  children,
  actionLabel,
  onAction,
  destructive,
  cancelLabel,
  ...props
}: AlertDialogProps) {
  const t = useTranslations("ds");
  return (
    <ModalOverlay {...props} isDismissable={false} className={cx(overlay, "items-center p-6")}>
      <Modal className="w-full max-w-xs rounded-sheet bg-bg-tertiary text-label shadow-elevated data-entering:animate-pop-in data-exiting:animate-fade-out forced-colors:border">
        <Dialog role="alertdialog" className="flex flex-col gap-4 p-5 text-center outline-none">
          {({ close }) => (
            <>
              <div className="flex flex-col gap-1">
                <Heading slot="title" className="text-headline">
                  {title}
                </Heading>
                <div className="text-subheadline text-label">{children}</div>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  fullWidth
                  destructive={destructive}
                  onPress={() => {
                    onAction();
                    close();
                  }}
                >
                  {actionLabel}
                </Button>
                <Button fullWidth variant="gray" onPress={close} autoFocus>
                  {cancelLabel ?? t("cancel")}
                </Button>
              </div>
            </>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

export interface SheetAction {
  label: string;
  onAction: () => void;
  destructive?: boolean;
}

export interface ActionSheetProps extends Omit<ModalOverlayProps, "children"> {
  title: string;
  message?: ReactNode;
  actions: SheetAction[];
  cancelLabel?: string;
}

/** Action sheet: a short list of choices about the current item, with a separate Cancel. */
export function ActionSheet({ title, message, actions, cancelLabel, ...props }: ActionSheetProps) {
  const t = useTranslations("ds");
  const item =
    "focus-ring flex min-h-14 w-full cursor-pointer items-center justify-center px-4 text-title3 font-normal data-hovered:bg-fill data-pressed:bg-fill";
  return (
    <ModalOverlay {...props} isDismissable className={cx(overlay, "p-2 md:p-6")}>
      <Modal className="flex w-full max-w-md flex-col gap-2 pb-[env(safe-area-inset-bottom)] data-entering:animate-sheet-up data-exiting:animate-sheet-down md:data-entering:animate-pop-in">
        <Dialog aria-label={title} className="flex flex-col gap-2 outline-none">
          {({ close }) => (
            <>
              <div className="overflow-hidden rounded-card bg-bg-tertiary">
                <div className="hairline-b px-4 py-3 text-center">
                  <Heading
                    slot="title"
                    className="text-footnote font-semibold text-label-secondary"
                  >
                    {title}
                  </Heading>
                  {message && <p className="text-footnote text-label-secondary">{message}</p>}
                </div>
                {actions.map((a) => (
                  <AriaButton
                    key={a.label}
                    onPress={() => {
                      a.onAction();
                      close();
                    }}
                    className={cx(
                      item,
                      "hairline-b last:border-b-0",
                      a.destructive ? "text-red-text" : "text-accent-text",
                    )}
                  >
                    {a.label}
                  </AriaButton>
                ))}
              </div>
              <AriaButton
                onPress={close}
                autoFocus
                className={cx(item, "rounded-card bg-bg-tertiary font-semibold text-accent-text")}
              >
                {cancelLabel ?? t("cancel")}
              </AriaButton>
            </>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
