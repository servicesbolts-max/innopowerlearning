"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Button,
  ListBox,
  ListBoxItem,
  Select as AriaSelect,
  SelectValue,
  type ListBoxItemProps,
  type SelectProps as AriaSelectProps,
} from "react-aria-components";
import { cx, withClass } from "../../utils/cx";
import {
  FieldDescription,
  FieldErrorText,
  FieldLabel,
  type FieldChromeProps,
} from "../Field/Field";
import { Icon } from "../Icon/Icon";
import { Popover } from "../Popover/Popover";

export interface SelectProps<T extends object>
  extends Omit<AriaSelectProps<T>, "children">, FieldChromeProps {
  items?: Iterable<T>;
  children: React.ReactNode | ((item: T) => React.ReactNode);
}

/** Select (picker): a button that opens a list of options. Type to jump to an option. */
export function Select<T extends object>({
  label,
  description,
  errorMessage,
  items,
  children,
  className,
  placeholder,
  ...props
}: SelectProps<T>) {
  const t = useTranslations("ds");
  return (
    <AriaSelect
      {...props}
      placeholder={placeholder ?? t("selectPlaceholder")}
      className={withClass(className, "group flex flex-col gap-1.5")}
    >
      {label && <FieldLabel>{label}</FieldLabel>}
      <Button
        className={cx(
          "flex min-h-touch w-full cursor-pointer items-center justify-between gap-2 rounded-control border border-control-border bg-bg px-3 text-start text-body text-label focus-ring",
          "group-data-invalid:border-red-fill data-disabled:opacity-40 data-pressed:opacity-70",
        )}
      >
        <SelectValue className="truncate data-placeholder:text-label-secondary" />
        <Icon icon={ChevronsUpDown} size={16} className="text-label-secondary" />
      </Button>
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldErrorText>{errorMessage}</FieldErrorText>
      <Popover className="min-w-(--trigger-width)">
        <ListBox items={items} className="max-h-72 overflow-auto p-1 outline-none">
          {children}
        </ListBox>
      </Popover>
    </AriaSelect>
  );
}

/** One option in a Select, Menu-like list or ComboBox. */
export function SelectItem({
  children,
  className,
  ...props
}: ListBoxItemProps & { children: React.ReactNode }) {
  const textValue = props.textValue ?? (typeof children === "string" ? children : undefined);
  return (
    <ListBoxItem
      {...props}
      textValue={textValue}
      className={withClass(
        className,
        "group flex min-h-touch cursor-pointer items-center gap-2 rounded-control px-2.5 text-body text-label outline-none data-disabled:opacity-40 data-focused:bg-fill",
      )}
    >
      <span className="w-5 shrink-0 text-accent-text">
        <Icon icon={Check} size={16} className="hidden group-data-selected:block" />
      </span>
      <span className="truncate group-data-selected:font-semibold">{children}</span>
    </ListBoxItem>
  );
}
