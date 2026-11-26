import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { FinanceTransaction } from "./compute";

/*
 * LIVE: manual finance transactions (Supabase). RLS restricts the table to
 * owners and administrators; a failed query returns null so the page shows
 * an error instead of zeros.
 */

export const listTransactions = cache(async (): Promise<FinanceTransaction[] | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("finance_transactions")
    .select("id, type, category, amount, robux_amount, occurred_on, description, game_id, project_id, games(name), projects(name)")
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) return null;
  return data.map((row) => ({
    id: row.id,
    type: row.type,
    category: row.category,
    amount: Number(row.amount),
    robuxAmount: row.robux_amount === null ? null : Number(row.robux_amount),
    occurredOn: row.occurred_on,
    description: row.description,
    gameId: row.game_id,
    gameName: row.games?.name ?? null,
    projectId: row.project_id,
    projectName: row.projects?.name ?? null,
  }));
});

export type FinanceFormOptions = {
  games: { id: string; name: string }[];
  projects: { id: string; name: string }[];
};

export const getFinanceFormOptions = cache(async (): Promise<FinanceFormOptions> => {
  const supabase = await createClient();
  const [games, projects] = await Promise.all([
    supabase.from("games").select("id, name").order("name"),
    supabase.from("projects").select("id, name").order("name"),
  ]);
  return { games: games.data ?? [], projects: projects.data ?? [] };
});
