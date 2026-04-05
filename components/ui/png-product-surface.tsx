import { cn } from "@/lib/utils";

export function PngProductSurface({
  watermark,
  className,
}: {
  watermark: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 overflow-hidden rounded-[inherit] bg-[linear-gradient(180deg,var(--color-surface-strong)_0%,var(--color-surface-elevated)_100%)]",
        className,
      )}
    >
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(15,23,42,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.08) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="absolute inset-x-10 top-6 h-24 rounded-full bg-[color:var(--color-accent-soft)] blur-3xl" />
      <div className="absolute inset-x-14 bottom-6 h-16 rounded-full bg-[color:var(--color-accent-line)]/40 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="select-none text-[clamp(1.5rem,5vw,3.75rem)] font-semibold uppercase tracking-[0.6em] text-[color:var(--color-text)]/8">
          {watermark}
        </span>
      </div>
    </div>
  );
}
