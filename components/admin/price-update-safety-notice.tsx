import { priceUpdatesSafetyCopy } from "@/lib/admin/price-updates-ui";
import { cn } from "@/lib/utils";

export function PriceUpdateSafetyNotice({
  locale,
  className,
}: {
  locale: string;
  className?: string;
}) {
  const { title, body } = priceUpdatesSafetyCopy(locale);

  return (
    <aside
      className={cn(
        "rounded-[1.4rem] border border-amber-500/40 bg-amber-500/10 px-5 py-4 text-sm text-[color:var(--color-text)]",
        className,
      )}
      role="note"
    >
      <p className="font-semibold text-amber-900 dark:text-amber-100">{title}</p>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-[color:var(--color-text-soft)]">
        {body.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </aside>
  );
}
