import { CircleDashed } from "lucide-react";
import { Card } from "@/components/ui/card";

type PlannedPageProps = {
  /** Milestone that delivers this page, e.g. "Milestone C". */
  milestone: string;
  /** What the page will contain, in display order. */
  sections: string[];
};

/**
 * Temporary scaffold shown on pages whose content lands in a later milestone.
 * States plainly what is coming instead of showing decorative UI.
 * Each page replaces this component when it is built.
 */
export function PlannedPage({ milestone, sections }: PlannedPageProps) {
  return (
    <Card className="border-dashed">
      <div className="flex flex-col gap-5 p-6 md:flex-row md:items-start md:gap-10">
        <div className="md:w-64">
          <span className="inline-flex items-center gap-1.5 rounded-xs border border-line-strong bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-fg-3">
            <CircleDashed className="size-3" aria-hidden />
            {milestone}
          </span>
          <p className="mt-3 text-sm font-medium text-fg">This page is being built</p>
          <p className="mt-1 text-xs leading-relaxed text-fg-3">
            The structure is in place. The sections listed here will be delivered in {milestone}.
          </p>
        </div>
        <ul className="grid flex-1 gap-2 sm:grid-cols-2">
          {sections.map((section) => (
            <li
              key={section}
              className="flex items-center gap-2.5 rounded-md border border-line bg-surface-2/50 px-3 py-2.5 text-[13px] text-fg-2"
            >
              <span className="size-1.5 shrink-0 rounded-full bg-fg-4" aria-hidden />
              {section}
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
