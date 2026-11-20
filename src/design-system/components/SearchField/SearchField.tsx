"use client";

import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Button,
  Group,
  Input,
  SearchField as AriaSearchField,
  Tag,
  TagGroup,
  TagList,
  type Key,
  type SearchFieldProps as AriaSearchFieldProps,
} from "react-aria-components";
import { withClass } from "../../utils/cx";
import { FieldLabel, inputGroup } from "../Field/Field";
import { Icon } from "../Icon/Icon";

export interface SearchToken {
  id: Key;
  label: string;
}

export interface SearchFieldProps extends AriaSearchFieldProps {
  label?: React.ReactNode;
  placeholder?: string;
  /** Filter tokens shown before the text (for example "Category: Design"). */
  tokens?: SearchToken[];
  onRemoveToken?: (id: Key) => void;
}

/**
 * Search field with optional filter tokens. Escape clears the text; Backspace in an empty field
 * removes the last token; each token also has its own remove button.
 */
export function SearchField({
  label,
  placeholder,
  tokens = [],
  onRemoveToken,
  className,
  ...props
}: SearchFieldProps) {
  const t = useTranslations("ds");
  return (
    <AriaSearchField {...props} className={withClass(className, "group flex flex-col gap-1.5")}>
      {label && <FieldLabel>{label}</FieldLabel>}
      <Group className={`${inputGroup} flex-wrap py-1`}>
        <Icon icon={Search} size={20} className="ms-1 text-label-secondary" />
        {tokens.length > 0 && (
          <TagGroup
            aria-label={t("filter")}
            onRemove={(keys) => keys.forEach((k) => onRemoveToken?.(k))}
          >
            <TagList items={tokens} className="flex flex-wrap gap-1">
              {(token) => (
                <Tag
                  id={token.id}
                  textValue={token.label}
                  className="flex min-h-7 items-center gap-1 rounded-full bg-accent-tint ps-2.5 pe-1 text-footnote font-medium text-accent-text-on-tint focus-ring"
                >
                  {token.label}
                  <Button
                    slot="remove"
                    aria-label={t("remove")}
                    className="touch-target flex size-6 cursor-pointer items-center justify-center rounded-full data-hovered:bg-fill"
                  >
                    <Icon icon={X} size={16} />
                  </Button>
                </Tag>
              )}
            </TagList>
          </TagGroup>
        )}
        <Input
          placeholder={placeholder ?? t("search")}
          onKeyDown={(e) => {
            const last = tokens.at(-1);
            if (e.key === "Backspace" && e.currentTarget.value === "" && last)
              onRemoveToken?.(last.id);
          }}
          className="min-w-24 flex-1 bg-transparent px-1 outline-none placeholder:text-label-secondary [&::-webkit-search-cancel-button]:hidden"
        />
        <Button
          aria-label={t("clearSearch")}
          className="touch-target flex size-8 cursor-pointer items-center justify-center rounded-full text-label-secondary group-data-empty:invisible data-hovered:bg-fill"
        >
          <Icon icon={X} size={16} />
        </Button>
      </Group>
    </AriaSearchField>
  );
}
