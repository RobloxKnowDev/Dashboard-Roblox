"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils/cn";
import { Button } from "./button";
import { Table, TBody, TD, TH, THead, TR } from "./table";

export type Column<T> = {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Provide to make the column sortable. */
  sortValue?: (row: T) => string | number | null;
  align?: "left" | "right" | "center";
  className?: string;
};

type SortState = { id: string; direction: "asc" | "desc" } | null;

type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  /** Rendered instead of the table body when there are no rows. */
  empty?: ReactNode;
  pageSize?: number;
  initialSort?: SortState;
  onRowClick?: (row: T) => void;
  caption?: string;
};

const alignClass = { left: "text-left", right: "text-right", center: "text-center" } as const;

export function DataTable<T>({
  columns,
  rows,
  getRowId,
  empty,
  pageSize = 10,
  initialSort = null,
  onRowClick,
  caption,
}: DataTableProps<T>) {
  const t = useT();
  const [sort, setSort] = useState<SortState>(initialSort);
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((c) => c.id === sort.id);
    if (!column?.sortValue) return rows;
    const getValue = column.sortValue;
    const factor = sort.direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = getValue(a);
      const vb = getValue(b);
      if (va === vb) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      return (va < vb ? -1 : 1) * factor;
    });
  }, [rows, columns, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = sorted.slice(currentPage * pageSize, currentPage * pageSize + pageSize);

  function toggleSort(id: string) {
    setPage(0);
    setSort((prev) => {
      if (!prev || prev.id !== id) return { id, direction: "desc" };
      if (prev.direction === "desc") return { id, direction: "asc" };
      return null;
    });
  }

  if (rows.length === 0 && empty) return <>{empty}</>;

  return (
    <div>
      <Table>
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <THead>
          <tr>
            {columns.map((column) => {
              const active = sort?.id === column.id;
              const ariaSort = active ? (sort.direction === "asc" ? "ascending" : "descending") : undefined;
              const align = column.align ?? "left";
              return (
                <TH key={column.id} aria-sort={ariaSort} className={cn(alignClass[align], column.className)}>
                  {column.sortValue ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(column.id)}
                      className={cn(
                        "inline-flex items-center gap-1 uppercase tracking-wider transition-colors hover:text-fg-2",
                        active && "text-fg-2",
                      )}
                    >
                      {column.header}
                      {active ? (
                        sort.direction === "asc" ? (
                          <ArrowUp className="size-3" aria-hidden />
                        ) : (
                          <ArrowDown className="size-3" aria-hidden />
                        )
                      ) : (
                        <ArrowUpDown className="size-3 opacity-40" aria-hidden />
                      )}
                    </button>
                  ) : (
                    column.header
                  )}
                </TH>
              );
            })}
          </tr>
        </THead>
        <TBody>
          {visible.map((row) => (
            <TR
              key={getRowId(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={onRowClick ? "cursor-pointer" : undefined}
            >
              {columns.map((column) => (
                <TD key={column.id} className={cn(alignClass[column.align ?? "left"], column.className)}>
                  {column.cell(row)}
                </TD>
              ))}
            </TR>
          ))}
        </TBody>
      </Table>
      {pageCount > 1 ? (
        <div className="flex items-center justify-between border-t border-line px-4 py-2.5 text-xs text-fg-3">
          <span className="tabular">
            {t.common.actions.pageRange(currentPage * pageSize + 1, Math.min(sorted.length, (currentPage + 1) * pageSize), sorted.length)}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t.common.actions.previousPage}
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t.common.actions.nextPage}
              disabled={currentPage >= pageCount - 1}
              onClick={() => setPage(currentPage + 1)}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
