"use client";

import { ArrowDown, ArrowUp, Columns3 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState, type ReactNode } from "react";
import {
  Cell,
  Collection,
  Column,
  DialogTrigger,
  Row,
  Table,
  TableBody,
  TableHeader,
  type Key,
  type Selection,
  type SortDescriptor,
} from "react-aria-components";
import { cx } from "../../utils/cx";
import { Button } from "../Button/Button";
import { Checkbox, CheckboxGroup } from "../Checkbox/Checkbox";
import { Icon } from "../Icon/Icon";
import { PopoverDialog } from "../Popover/Popover";
import { SearchField } from "../SearchField/SearchField";

export interface DataTableColumn<T> {
  id: string;
  label: string;
  /** The column that names each row for screen readers (exactly one). */
  isRowHeader?: boolean;
  sortable?: boolean;
  /** Users can hide this column (row-header columns cannot be hidden). */
  hideable?: boolean;
  align?: "start" | "end";
  /** Value used for sorting and filtering. */
  value: (row: T) => string | number;
  /** Custom cell content; defaults to `value`. */
  render?: (row: T) => ReactNode;
}

export interface DataTableProps<T extends { id: Key }> {
  "aria-label": string;
  columns: DataTableColumn<T>[];
  rows: T[];
  /** Enables row checkboxes and the bulk-action bar. */
  selectable?: boolean;
  /** Actions for the selected rows, shown above the table while any row is selected. */
  bulkActions?: (selected: Set<Key>, clear: () => void) => ReactNode;
  /** Shows a filter field that matches any column value. */
  filterable?: boolean;
  /** Maximum height before the body scrolls under a sticky header (CSS length). */
  maxHeight?: string;
  emptyState?: ReactNode;
  /** Dense admin variant: 32 px rows and 15 px text (Section 7.1, 7.3). */
  dense?: boolean;
}

function compare(a: string | number, b: string | number) {
  return typeof a === "number" && typeof b === "number"
    ? a - b
    : String(a).localeCompare(String(b));
}

/**
 * Data table: sortable columns, text filter, column visibility, row selection with bulk actions,
 * and a sticky header. Keyboard: arrows move between cells, Space selects, Enter sorts a header.
 */
export function DataTable<T extends { id: Key }>({
  columns,
  rows,
  selectable,
  bulkActions,
  filterable,
  maxHeight,
  emptyState,
  dense,
  ...props
}: DataTableProps<T>) {
  const t = useTranslations("ds");
  const [sort, setSort] = useState<SortDescriptor | undefined>();
  const [query, setQuery] = useState("");
  const [hidden, setHidden] = useState<string[]>([]);
  const [selected, setSelected] = useState<Selection>(new Set());

  const visibleColumns = columns.filter((c) => !hidden.includes(c.id));
  const hideable = columns.filter((c) => c.hideable !== false && !c.isRowHeader);

  const shownRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? rows.filter((r) => columns.some((c) => String(c.value(r)).toLowerCase().includes(q)))
      : rows;
    const col = sort && columns.find((c) => c.id === sort.column);
    if (!col) return filtered;
    const sorted = [...filtered].sort((a, b) => compare(col.value(a), col.value(b)));
    return sort.direction === "descending" ? sorted.reverse() : sorted;
  }, [rows, columns, query, sort]);

  const selectedKeys: Set<Key> =
    selected === "all" ? new Set(shownRows.map((r) => r.id)) : (selected as Set<Key>);
  const clear = () => setSelected(new Set());
  const rowHeight = dense ? "min-h-touch-dense text-subheadline" : "min-h-touch text-body";

  return (
    <div className="flex flex-col gap-3">
      {(filterable || hideable.length > 0 || (selectable && bulkActions)) && (
        <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label={t("toolbar")}>
          {selectable && selectedKeys.size > 0 && bulkActions ? (
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <span className="text-subheadline font-semibold" aria-live="polite">
                {t("selectedCount", { count: selectedKeys.size })}
              </span>
              {bulkActions(selectedKeys, clear)}
            </div>
          ) : (
            filterable && (
              <SearchField
                aria-label={t("filter")}
                value={query}
                onChange={setQuery}
                className="min-w-48 flex-1 sm:max-w-xs"
              />
            )
          )}
          {hideable.length > 0 && (
            <DialogTrigger>
              <Button variant="gray" size="small" className="ms-auto">
                <Icon icon={Columns3} size={16} />
                {t("columns")}
              </Button>
              <PopoverDialog aria-label={t("columns")} placement="bottom end">
                <CheckboxGroup
                  aria-label={t("columns")}
                  value={hideable.map((c) => c.id).filter((id) => !hidden.includes(id))}
                  onChange={(visible) =>
                    setHidden(hideable.map((c) => c.id).filter((id) => !visible.includes(id)))
                  }
                >
                  {hideable.map((c) => (
                    <Checkbox key={c.id} value={c.id}>
                      {c.label}
                    </Checkbox>
                  ))}
                </CheckboxGroup>
              </PopoverDialog>
            </DialogTrigger>
          )}
        </div>
      )}
      <div
        className="overflow-auto rounded-card border border-separator bg-bg-grouped-row forced-colors:border-[CanvasText]"
        style={maxHeight ? { maxHeight } : undefined}
      >
        <Table
          {...props}
          sortDescriptor={sort}
          onSortChange={setSort}
          selectionMode={selectable ? "multiple" : "none"}
          selectionBehavior="toggle"
          selectedKeys={selected}
          onSelectionChange={setSelected}
          className="w-full border-separate border-spacing-0"
        >
          <TableHeader className="sticky top-0 z-10 material">
            {selectable && (
              <Column className="w-12 hairline-b px-3 text-start">
                <Checkbox slot="selection" aria-label={t("selectAll")} />
              </Column>
            )}
            {visibleColumns.map((c) => (
              <Column
                key={c.id}
                id={c.id}
                isRowHeader={c.isRowHeader}
                allowsSorting={c.sortable}
                className={cx(
                  "hairline-b px-3 py-2 text-footnote font-semibold whitespace-nowrap text-label-secondary focus-ring -outline-offset-2",
                  c.align === "end" ? "text-end" : "text-start",
                  c.sortable && "cursor-pointer data-hovered:text-label",
                )}
              >
                {({ sortDirection }) => (
                  <span
                    className={cx(
                      "inline-flex items-center gap-1",
                      c.align === "end" && "flex-row-reverse",
                    )}
                  >
                    {c.label}
                    {sortDirection && (
                      <Icon
                        icon={sortDirection === "ascending" ? ArrowUp : ArrowDown}
                        size={16}
                        className="text-accent-text"
                      />
                    )}
                  </span>
                )}
              </Column>
            ))}
          </TableHeader>
          <TableBody
            items={shownRows}
            dependencies={[visibleColumns, selectable]}
            renderEmptyState={() => (
              <div className="py-10 text-center text-body text-label-secondary">
                {emptyState ?? t("noResults")}
              </div>
            )}
          >
            {(row) => (
              <Row
                id={row.id}
                columns={visibleColumns}
                className="group/row focus-ring -outline-offset-2 data-hovered:bg-fill data-selected:bg-accent-tint"
              >
                {selectable && (
                  <Cell className="hairline-b px-3 group-last/row:border-b-0">
                    <Checkbox slot="selection" />
                  </Cell>
                )}
                <Collection items={visibleColumns}>
                  {(column) => (
                    <Cell
                      className={cx(
                        "hairline-b px-3 py-2 text-label focus-ring -outline-offset-2 group-last/row:border-b-0",
                        rowHeight,
                        column.align === "end" ? "text-end tabular-nums" : "text-start",
                      )}
                    >
                      {column.render ? column.render(row) : column.value(row)}
                    </Cell>
                  )}
                </Collection>
              </Row>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
