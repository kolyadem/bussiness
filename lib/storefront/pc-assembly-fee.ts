/**
 * Розрахунок вартості послуги збірки ПК з налаштувань сайту.
 * Джерело істини — поля SiteSettings.assemblyBaseFeeUah та SiteSettings.assemblyPercent.
 * Значення в копійках; відсоток — ціле число (наприклад 2 = 2%).
 */

/** Явні другорядні дефолти, якщо запис налаштувань недоступний (узгоджено з БД default 0). */
export const FALLBACK_ASSEMBLY_BASE_FEE_UAH = 0;
export const FALLBACK_ASSEMBLY_PERCENT = 0;

export type AssemblyFeeSettings = {
  assemblyBaseFeeUah: number;
  assemblyPercent: number;
};

export function resolveAssemblyFeeSettings(
  row:
    | {
        assemblyBaseFeeUah?: number | null;
        assemblyPercent?: number | null;
      }
    | null
    | undefined,
): AssemblyFeeSettings {
  return {
    assemblyBaseFeeUah: row?.assemblyBaseFeeUah ?? FALLBACK_ASSEMBLY_BASE_FEE_UAH,
    assemblyPercent: row?.assemblyPercent ?? FALLBACK_ASSEMBLY_PERCENT,
  };
}

/**
 * Формула: base + floor(componentsSubtotal * percent / 100).
 * Якщо у кошику/заяві немає позицій збірки (pc-build), повертає 0.
 */
export function computePcAssemblyServiceFeeUah(args: {
  componentsSubtotal: number;
  hasPcBuild: boolean;
} & AssemblyFeeSettings): number {
  if (!args.hasPcBuild) {
    return 0;
  }

  const base = Math.max(0, Math.floor(Number(args.assemblyBaseFeeUah) || 0));
  const pct = Math.max(0, Math.min(100, Math.floor(Number(args.assemblyPercent) || 0)));
  const sub = Math.max(0, Math.floor(args.componentsSubtotal));
  const percentPart = Math.floor((sub * pct) / 100);

  return base + percentPart;
}
