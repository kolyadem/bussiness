"use client";

import { useMemo, useState } from "react";
import type { AppLocale } from "@/lib/constants";
import { cn, formatPrice, STOREFRONT_CURRENCY_CODE } from "@/lib/utils";

type TrendPoint = {
  label: string;
  orders: number;
  revenue: number;
  profit: number | null;
};

type TrendRange = "day" | "week" | "month";

const chartHeight = 220;
const chartWidth = 720;

function buildLinePath(points: number[]) {
  if (points.length === 0) {
    return "";
  }

  const maxValue = Math.max(...points, 1);
  const stepX = points.length > 1 ? chartWidth / (points.length - 1) : chartWidth;

  return points
    .map((value, index) => {
      const x = index * stepX;
      const y = chartHeight - (value / maxValue) * (chartHeight - 24) - 12;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

export function AdminDashboardTrends({
  locale,
  title,
  subtitle,
  labels,
  datasets,
}: {
  locale: AppLocale;
  title: string;
  subtitle: string;
  labels: {
    day: string;
    week: string;
    month: string;
    revenue: string;
    profit: string;
  };
  datasets: Record<TrendRange, TrendPoint[]>;
}) {
  const [range, setRange] = useState<TrendRange>("day");
  const activeDataset = datasets[range];
  const revenuePoints = activeDataset.map((point) => point.revenue);
  const profitPoints = activeDataset.map((point) => point.profit ?? 0);
  const revenuePath = useMemo(() => buildLinePath(revenuePoints), [revenuePoints]);
  const profitPath = useMemo(() => buildLinePath(profitPoints), [profitPoints]);

  return (
    <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <h3 className="text-2xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)]">
            {title}
          </h3>
          <p className="mt-2 text-sm leading-7 text-[color:var(--color-text-soft)]">{subtitle}</p>
        </div>

        <div className="inline-flex rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] p-1">
          {(["day", "week", "month"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setRange(item)}
              className={cn(
                "rounded-full px-4 py-2 text-sm transition",
                range === item
                  ? "bg-[color:var(--color-surface)] text-[color:var(--color-text)] shadow-[0_0_0_1px_var(--color-line)]"
                  : "text-[color:var(--color-text-soft)] hover:text-[color:var(--color-text)]",
              )}
            >
              {labels[item]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-[1.6rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] p-4">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="inline-flex items-center gap-2 text-[color:var(--color-text-soft)]">
            <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--color-accent-strong)]" />
            {labels.revenue}
          </span>
          <span className="inline-flex items-center gap-2 text-[color:var(--color-text-soft)]">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            {labels.profit}
          </span>
        </div>

        <div className="mt-5 overflow-x-auto">
          <div className="min-w-[720px]">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="h-[220px] w-full"
              role="img"
              aria-label="Графік виручки та прибутку"
            >
              {[0, 1, 2, 3].map((line) => {
                const y = 16 + ((chartHeight - 32) / 3) * line;

                return (
                  <line
                    key={line}
                    x1="0"
                    y1={y}
                    x2={chartWidth}
                    y2={y}
                    stroke="color-mix(in oklab, var(--color-line) 78%, transparent)"
                    strokeDasharray="4 8"
                    strokeWidth="1"
                  />
                );
              })}
              <path d={revenuePath} fill="none" stroke="var(--color-accent-strong)" strokeWidth="3" strokeLinecap="round" />
              <path d={profitPath} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {activeDataset.map((point) => (
            <div
              key={point.label}
              className="rounded-[1.1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-3"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-text-soft)]">
                {point.label}
              </p>
              <p className="mt-2 text-sm text-[color:var(--color-text-soft)]">
                {labels.revenue}:{" "}
                <span className="text-[color:var(--color-text)]">
                  {formatPrice(point.revenue, locale, STOREFRONT_CURRENCY_CODE)}
                </span>
              </p>
              <p className="mt-1 text-sm text-[color:var(--color-text-soft)]">
                {labels.profit}:{" "}
                <span className="text-[color:var(--color-text)]">
                  {formatPrice(point.profit ?? 0, locale, STOREFRONT_CURRENCY_CODE)}
                </span>
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
