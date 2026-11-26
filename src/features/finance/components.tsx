"use client";

import { ArrowDownLeft, ArrowUpRight, Receipt } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/feedback/states";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { SearchInput } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils/cn";
import { formatCurrency, formatDate, formatRobux } from "@/lib/utils/format";
import type { FinanceTransaction } from "./compute";
import { CATEGORY_LABELS, type TransactionInput } from "./schemas";
import { DeleteTransactionButton, EditTransactionButton, type TransactionFormOptions } from "./transaction-form";

type Filter = "all" | "revenue" | "expense";

function toInput(t: FinanceTransaction): TransactionInput {
  return {
    type: t.type,
    category: t.category,
    amount: String(t.amount),
    robuxAmount: t.robuxAmount === null ? "" : String(t.robuxAmount),
    occurredOn: t.occurredOn,
    description: t.description ?? "",
    gameId: t.gameId ?? "",
    projectId: t.projectId ?? "",
  };
}

function describe(t: FinanceTransaction): string {
  return t.description || CATEGORY_LABELS[t.category];
}

export function TransactionsTable({ transactions, options }: { transactions: FinanceTransaction[]; options: TransactionFormOptions }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const rows = transactions.filter((t) => {
    if (filter !== "all" && t.type !== filter) return false;
    if (!q) return true;
    return `${t.description ?? ""} ${CATEGORY_LABELS[t.category]} ${t.gameName ?? ""} ${t.projectName ?? ""}`.toLowerCase().includes(q);
  });

  const columns: Column<FinanceTransaction>[] = [
    {
      id: "date",
      header: "Date",
      sortValue: (t) => t.occurredOn,
      className: "w-32",
      cell: (t) => <span className="whitespace-nowrap tabular text-fg-2">{formatDate(t.occurredOn)}</span>,
    },
    {
      id: "description",
      header: "Description",
      sortValue: (t) => describe(t).toLowerCase(),
      cell: (t) => (
        <div className="min-w-0">
          <p className="max-w-sm truncate text-fg">{describe(t)}</p>
          {t.gameName || t.projectName ? (
            <p className="max-w-sm truncate text-xs text-fg-3">{[t.gameName, t.projectName].filter(Boolean).join(" · ")}</p>
          ) : null}
        </div>
      ),
    },
    {
      id: "category",
      header: "Category",
      sortValue: (t) => CATEGORY_LABELS[t.category],
      cell: (t) => (
        <Badge
          tone={t.type === "revenue" ? "good" : "neutral"}
          icon={t.type === "revenue" ? <ArrowDownLeft aria-hidden /> : <ArrowUpRight aria-hidden />}
        >
          {CATEGORY_LABELS[t.category]}
        </Badge>
      ),
    },
    {
      id: "robux",
      header: "Robux",
      align: "right",
      sortValue: (t) => t.robuxAmount,
      cell: (t) => <span className="tabular text-fg-3">{t.robuxAmount === null ? "—" : formatRobux(t.robuxAmount)}</span>,
    },
    {
      id: "amount",
      header: "Amount",
      align: "right",
      sortValue: (t) => (t.type === "revenue" ? t.amount : -t.amount),
      cell: (t) => (
        <span className={cn("whitespace-nowrap font-medium tabular", t.type === "revenue" ? "text-good" : "text-fg")}>
          {t.type === "revenue" ? "+" : "−"}
          {formatCurrency(t.amount, { compact: false, cents: true })}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      className: "w-24",
      cell: (t) => (
        <div className="flex justify-end">
          <EditTransactionButton options={options} transaction={{ id: t.id, values: toInput(t) }} label={describe(t)} />
          <DeleteTransactionButton transactionId={t.id} label={describe(t)} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SegmentedControl
          aria-label="Transaction type"
          value={filter}
          onValueChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "revenue", label: "Revenue" },
            { value: "expense", label: "Expenses" },
          ]}
        />
        <SearchInput
          aria-label="Search transactions"
          placeholder="Search transactions…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full sm:w-64"
        />
      </div>
      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <DataTable
          columns={columns}
          rows={rows}
          getRowId={(t) => t.id}
          pageSize={15}
          caption="Transactions"
          empty={<EmptyState compact icon={Receipt} title="No transactions match" description="Try another filter or search." />}
        />
      </div>
    </div>
  );
}
