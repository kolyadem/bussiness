import type { ReactNode } from "react";
import { SearchX } from "lucide-react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-[2.2rem] border border-dashed border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] px-6 py-12 text-center shadow-[var(--shadow-soft)] backdrop-blur-xl sm:px-10 sm:py-14">
      <div className="absolute inset-x-1/2 top-0 h-32 w-32 -translate-x-1/2 rounded-full bg-[color:var(--color-accent-soft)] opacity-80 blur-3xl" />
      <div className="relative mx-auto flex max-w-xl flex-col items-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[color:var(--color-accent-line)] bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent-strong)] shadow-[0_18px_40px_rgba(24,184,255,0.12)]">
          <SearchX className="h-6 w-6" />
        </div>
        <h2 className="mt-5 font-heading text-[1.7rem] font-semibold tracking-[-0.03em] text-[color:var(--color-text)]">
          {title}
        </h2>
        {description ? (
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[color:var(--color-text-soft)]">
            {description}
          </p>
        ) : null}
        {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
      </div>
    </div>
  );
}
