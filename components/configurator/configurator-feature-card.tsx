import { ArrowUpRight, Cpu, Sparkles, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AppLocale } from "@/lib/constants";
import { Link } from "@/lib/i18n/routing";
import { getSiteExperienceCopy } from "@/lib/site-experience";
import { SITE_MODES, type SiteMode } from "@/lib/site-mode";

function getStoreCopy(locale: AppLocale, variant: "default" | "catalog") {
  if (variant === "catalog") {
    return {
      badge:
        locale === "uk"
          ? "Конфігуратор ПК"
          : locale === "ru"
            ? "Конфигуратор ПК"
            : "PC Configurator",
      title:
        locale === "uk"
          ? "Зібрати конфігурацію по компонентах"
          : locale === "ru"
            ? "Собрать конфигурацию по компонентам"
            : "Build a PC configuration step by step",
      description:
        locale === "uk"
          ? "Перейдіть до configurator, щоб послідовно підібрати сумісні компоненти й зібрати систему під свій сценарій."
          : locale === "ru"
            ? "Перейдите в configurator, чтобы по шагам подобрать совместимые компоненты и собрать систему под свой сценарий."
            : "Open the configurator to choose compatible parts step by step and shape a system around your goals.",
      cta:
        locale === "uk"
          ? "Відкрити configurator"
          : locale === "ru"
            ? "Открыть configurator"
            : "Open configurator",
      points:
        locale === "uk"
          ? ["Сумісні компоненти", "Покроковий сценарій", "Збереження збірки"]
          : locale === "ru"
            ? ["Совместимые компоненты", "Пошаговый сценарий", "Сохранение сборки"]
            : ["Compatible parts", "Step-by-step flow", "Saved builds"],
    };
  }

  return {
    badge:
      locale === "uk"
        ? "Конфігуратор ПК"
        : locale === "ru"
          ? "Конфигуратор ПК"
          : "PC Configurator",
    title:
      locale === "uk"
        ? "Підбір сумісної конфігурації без зайвого шуму"
        : locale === "ru"
          ? "Подбор совместимой конфигурации без лишнего шума"
          : "Shape a compatible PC without extra noise",
    description:
      locale === "uk"
        ? "Оберіть ключові компоненти, перевірте сумісність і збережіть збірку в одному акуратному сценарії."
        : locale === "ru"
          ? "Подберите ключевые компоненты, проверьте совместимость и сохраните сборку в одном аккуратном сценарии."
          : "Choose core components, check compatibility, and keep the build together in one focused flow.",
    cta:
      locale === "uk"
        ? "Перейти до configurator"
        : locale === "ru"
          ? "Перейти в configurator"
          : "Go to configurator",
    points:
      locale === "uk"
        ? ["CPU, GPU, пам'ять, корпус", "Перевірка сумісності", "Швидкий перехід до вибору слотів"]
        : locale === "ru"
          ? ["CPU, GPU, память, корпус", "Проверка совместимости", "Быстрый переход к выбору слотов"]
          : ["CPU, GPU, memory, case", "Compatibility checks", "Fast slot-by-slot selection"],
  };
}

export function ConfiguratorFeatureCard({
  locale,
  variant = "default",
  siteMode = SITE_MODES.store,
}: {
  locale: AppLocale;
  variant?: "default" | "catalog";
  siteMode?: SiteMode;
}) {
  const experience = getSiteExperienceCopy(locale, siteMode);
  const storeCopy = getStoreCopy(locale, variant);
  const isPcBuild = siteMode === SITE_MODES.pcBuild;
  const copy = isPcBuild
    ? {
        badge: experience?.navConfigurator ?? storeCopy.badge,
        title:
          variant === "catalog"
            ? experience?.catalogTitle ?? storeCopy.title
            : experience?.serviceTitle ?? storeCopy.title,
        description: experience?.serviceText ?? storeCopy.description,
        cta: experience?.heroSecondary ?? storeCopy.cta,
        points: experience?.serviceCards.map((item) => item.title) ?? storeCopy.points,
      }
    : storeCopy;

  const wrapperClassName =
    variant === "catalog"
      ? "group relative overflow-hidden rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-gradient-surface)] p-5 shadow-[var(--shadow-soft)] xl:col-span-1"
      : "group relative overflow-hidden rounded-[2.4rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-gradient-surface)] p-6 shadow-[var(--shadow-soft)] sm:p-8";

  return (
    <article className={wrapperClassName}>
      <div className="absolute inset-x-12 top-0 h-28 rounded-full bg-[color:var(--color-accent-soft)] opacity-70 blur-3xl" />
      <div className="relative flex h-full flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-accent-line)] bg-[color:var(--color-accent-soft)] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--color-text)]">
            {isPcBuild ? <Wrench className="h-3.5 w-3.5" /> : <Cpu className="h-3.5 w-3.5" />}
            {copy.badge}
          </span>
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] text-[color:var(--color-text-soft)]">
            <Sparkles className="h-4 w-4" />
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="max-w-xl font-heading text-2xl font-semibold tracking-[-0.04em] text-[color:var(--color-text)] sm:text-3xl">
            {copy.title}
          </h2>
          {copy.description ? (
            <p className="max-w-2xl text-sm leading-7 text-[color:var(--color-text-soft)]">
              {copy.description}
            </p>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {copy.points.slice(0, 3).map((point) => (
            <div
              key={point}
              className="rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-4 text-sm text-[color:var(--color-text-soft)]"
            >
              {point}
            </div>
          ))}
        </div>

        <div className="mt-auto">
          <Link href="/configurator" className="inline-flex w-full sm:w-auto">
            <Button className="w-full sm:min-w-52">
              {copy.cta}
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </article>
  );
}
