import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

const MESSAGE = "Не весь асортимент онлайн — за запитом підберемо будь-які компоненти.";

export function ComponentsAvailabilityNotice({ className }: { className?: string }) {
  return (
    <aside
      className={cn(
        "flex gap-3 rounded-[1.35rem] border border-[color:var(--color-line)] bg-[color:var(--color-background-secondary)] px-4 py-3 sm:px-5 sm:py-3.5",
        className,
      )}
      aria-label="Інформація про наявність комплектуючих"
    >
      <Info
        className="mt-0.5 h-[1.05rem] w-[1.05rem] shrink-0 text-[color:var(--color-accent-strong)] opacity-90"
        aria-hidden
      />
      <p className="text-[13px] leading-relaxed text-[color:var(--color-text-soft)] sm:text-sm">{MESSAGE}</p>
    </aside>
  );
}
