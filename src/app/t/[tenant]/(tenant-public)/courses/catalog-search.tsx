"use client";

import Form from "next/form";
import { useTranslations } from "next-intl";
import { Button, SearchField } from "@/design-system";

/** GET search form: the query lives in the URL (`/courses?q=`), so results can be shared. */
export function CatalogSearch({ defaultValue }: { defaultValue: string }) {
  const t = useTranslations("lms.catalog");
  return (
    <Form action="/courses" role="search" className="flex max-w-reading items-end gap-2">
      <SearchField
        name="q"
        aria-label={t("search")}
        placeholder={t("search")}
        defaultValue={defaultValue}
        maxLength={100}
        className="min-w-0 flex-1"
      />
      <Button type="submit" variant="tinted">
        {t("search")}
      </Button>
    </Form>
  );
}
