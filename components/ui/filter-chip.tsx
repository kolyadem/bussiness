import { cn } from "@/lib/utils";

const base =
  "rounded-full border px-4 py-2 text-sm outline-none transition duration-200 ease-out focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-line)] focus-visible:ring-offset-2 active:translate-y-px";

const tones = {
  active:
    "border-[color:var(--color-accent-line)] bg-[color:var(--color-accent-soft)] font-medium text-[color:var(--color-text)] shadow-[0_12px_28px_rgba(24,184,255,0.14)]",
  inactive:
    "border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-elevated)] font-medium text-[color:var(--color-text)] hover:border-[color:var(--color-accent-line)] hover:bg-[color:var(--color-surface)]",
  "small-active":
    "border-[color:var(--color-accent-line)] bg-[color:var(--color-accent-soft)] font-medium text-[color:var(--color-text)]",
  "small-inactive":
    "border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-[color:var(--color-text-soft)] hover:border-[color:var(--color-accent-line)] hover:bg-[color:var(--color-surface-elevated)] hover:text-[color:var(--color-text)]",
} as const;

export type FilterChipTone = keyof typeof tones;

export function FilterChip({
  active,
  tone = "active",
  inactiveTone,
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active: boolean;
  tone?: FilterChipTone;
  inactiveTone?: FilterChipTone;
}) {
  const activeTone = tones[tone];
  const resolvedInactive = tones[inactiveTone ?? (tone === "active" ? "inactive" : "small-inactive")];

  return (
    <button
      type="button"
      className={cn(base, active ? activeTone : resolvedInactive, className)}
      {...rest}
    >
      {children}
    </button>
  );
}
