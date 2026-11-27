"use client";

import { ArrowDownLeft, ArrowUpRight, Receipt } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/feedback/states";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { SearchInput } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useFormat, useT } from "@/i18n/client";
import { cn } from "@/lib/utils/cn";
import type { FinanceTransaction } from "./compute";
import type { TransactionInput } from "./schemas";
import { DeleteTransactionButton, EditTransactionButton, type TransactionFormOptions } from "./transaction-form";

type Filter = "all" | "revenue" | "expense";

function toInput(tx: FinanceTransaction): TransactionInput {
  return {
    type: tx.type,
    category: tx.category,
    amount: String(tx.amount),
    robuxAmount: tx.robuxAmount === null ? "" : String(tx.robuxAmount),
    occurredOn: tx.occurredOn,
    description: tx.description ?? "",
    gameId: tx.gameId ?? "",
    projectId: tx.projectId ?? "",
  };
}

export function TransactionsTable({ transactions, options }: { transactions: FinanceTransaction[]; options: TransactionFormOptions }) {
  const t = useT();
  const f = useFormat();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const categoryLabel = (tx: FinanceTransaction) => t.finance.categories[tx.category];
  const describe = (tx: FinanceTransaction) => tx.description || categoryLabel(tx);

  const q = query.trim().toLowerCase();
  const rows = transactions.filter((tx) => {
    if (filter !== "all" && tx.type !== filter) return false;
    if (!q) return true;
    return `${tx.description ?? ""} ${categoryLabel(tx)} ${tx.gameName ?? ""} ${tx.projectName ?? ""}`.toLowerCase().includes(q);
  });

  const columns: Column<FinanceTransaction>[] = [
    {
      id: "date",
      header: t.finance.table.colDate,
      sortValue: (tx) => tx.occurredOn,
      className: "w-32",
      cell: (tx) => <span className="whitespace-nowrap tabular text-fg-2">{f.formatDate(tx.occurredOn)}</span>,
    },
    {
      id: "description",
      header: t.finance.table.colDescription,
      sortValue: (tx) => describe(tx).toLowerCase(),
      cell: (tx) => (
        <div className="min-w-0">
          <p className="max-w-sm truncate text-fg">{describe(tx)}</p>
          {tx.gameName || tx.projectName ? (
            <p className="max-w-sm truncate text-xs text-fg-3">{[tx.gameName, tx.projectName].filter(Boolean).join(" · ")}</p>
          ) : null}
        </div>
      ),
    },
    {
      id: "category",
      header: t.finance.table.colCategory,
      sortValue: (tx) => categoryLabel(tx),
      cell: (tx) => (
        <Badge
          tone={tx.type === "revenue" ? "good" : "neutral"}
          icon={tx.type === "revenue" ? <ArrowDownLeft aria-hidden /> : <ArrowUpRight aria-hidden />}
        >
          {categoryLabel(tx)}
        </Badge>
      ),
    },
    {
      id: "robux",
      header: t.finance.table.colRobux,
      align: "right",
      sortValue: (tx) => tx.robuxAmount,
      cell: (tx) => <span className="tabular text-fg-3">{tx.robuxAmount === null ? "—" : f.formatRobux(tx.robuxAmount)}</span>,
    },
    {
      id: "amount",
      header: t.finance.table.colAmount,
      align: "right",
      sortValue: (tx) => (tx.type === "revenue" ? tx.amount : -tx.amount),
      cell: (tx) => (
        <span className={cn("whitespace-nowrap font-medium tabular", tx.type === "revenue" ? "text-good" : "text-fg")}>
          {tx.type === "revenue" ? "+" : "−"}
          {f.formatCurrency(tx.amount, { compact: false, cents: true })}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      className: "w-24",
      cell: (tx) => (
        <div className="flex justify-end">
          <EditTransactionButton options={options} transaction={{ id: tx.id, values: toInput(tx) }} label={describe(tx)} />
          <DeleteTransactionButton transactionId={tx.id} label={describe(tx)} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SegmentedControl
          aria-label={t.finance.table.filterLabel}
          value={filter}
          onValueChange={setFilter}
          options={[
            { value: "all", label: t.finance.table.all },
            { value: "revenue", label: t.finance.table.revenue },
            { value: "expense", label: t.finance.table.expenses },
          ]}
        />
        <SearchInput
          aria-label={t.finance.table.searchLabel}
          placeholder={t.finance.table.searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full sm:w-64"
        />
      </div>
      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <DataTable
          columns={columns}
          rows={rows}
          getRowId={(tx) => tx.id}
          pageSize={15}
          caption={t.finance.table.caption}
          empty={<EmptyState compact icon={Receipt} title={t.finance.table.noMatchTitle} description={t.finance.table.noMatchDescription} />}
        />
      </div>
    </div>
  );
}
