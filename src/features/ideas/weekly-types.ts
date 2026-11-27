/** Shapes stored in idea_runs.candidates and weekly_ideas (jsonb), shared by the pipeline and the page. */

export type RobloxMatch = {
  universeId: number;
  placeId: number;
  name: string;
  playing: number;
  upVotes: number;
  downVotes: number;
  description: string;
  visits: number | null;
};

export type SteamSummary = {
  appId: number;
  name: string;
  url: string;
  image: string | null;
  playing: number | null;
  reviewsCount: number | null;
  price: string | null;
  released: string | null;
  genres: string[];
};

export type Verdict = "exists" | "similar" | "free";

export type CandidateRecord = {
  steam: SteamSummary;
  concept: string;
  queries: string[];
  verdict: Verdict;
  summary: { en: string; fr: string };
  matches: RobloxMatch[];
};

export type LocalizedIdea = {
  title: string;
  pitch: string;
  genre: string;
  targetAudience: string;
  coreLoop: string;
  monetization: string;
  why: string;
};

export type WeeklyIdea = {
  id: string;
  rank: number;
  score: number | null;
  steam: SteamSummary;
  content: { en: LocalizedIdea; fr: LocalizedIdea };
  robloxCheck: { verdict: Verdict; summary: { en: string; fr: string }; queries: string[]; closest: RobloxMatch[] };
};

/** Monday of the ISO week of a calendar day ("2026-11-27" → "2026-11-23"). */
export function mondayOf(isoDay: string): string {
  const d = new Date(`${isoDay}T00:00:00Z`);
  const shift = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - shift);
  return d.toISOString().slice(0, 10);
}
