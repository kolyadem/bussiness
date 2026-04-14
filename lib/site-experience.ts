import type { AppLocale } from "@/lib/constants";
import { SITE_MODES, type SiteMode } from "@/lib/site-mode";

type ExperienceCopy = {
  navCatalog: string;
  navConfigurator: string;
  heroBadge: string;
  heroPrimary: string;
  heroSecondary: string;
  featuredTitle: string;
  catalogTitle: string;
  serviceTitle: string;
  serviceText: string;
  serviceCards: Array<{
    title: string;
    text: string;
  }>;
  emptyCart: string;
  emptyWishlist: string;
  emptyCompare: string;
  productActionPanelTitle: string;
  productActionPanelBody: string;
  addToBuild: string;
  discussBuild: string;
};

const PC_BUILD_EXPERIENCE_COPY: ExperienceCopy = {
  navCatalog: "Комплектуючі",
  navConfigurator: "Конфігуратор ПК",
  heroBadge: "конфігуратор ПК",
  heroPrimary: "Отримати підбір збірки",
  heroSecondary: "Перейти до конфігуратора",
  featuredTitle: "Комплектуючі для збірки",
  catalogTitle: "Комплектуючі та апгрейд",
  serviceTitle: "Що ми допоможемо зібрати",
  serviceText: "",
  serviceCards: [
    {
      title: "Ігрові ПК",
      text: "Підбір під жанри, роздільну здатність і FPS.",
    },
    {
      title: "Робота й навчання",
      text: "Монтаж, дизайн, офіс — з запасом на оновлення.",
    },
    {
      title: "Апгрейд",
      text: "Що міняти зараз, що — пізніше.",
    },
  ],
  emptyCart: "Додайте позиції для оформлення або обговорення.",
  emptyWishlist: "Зберігайте цікаві позиції для майбутньої збірки.",
  emptyCompare: "Порівнюйте характеристики перед вибором.",
  productActionPanelTitle: "Далі",
  productActionPanelBody: "У збірку або в конфігуратор — за вашим сценарієм.",
  addToBuild: "Додати у збірку",
  discussBuild: "Обговорити конфігурацію",
};

export function getSiteExperienceCopy(_locale: AppLocale, siteMode: SiteMode) {
  if (siteMode === SITE_MODES.pcBuild) {
    return PC_BUILD_EXPERIENCE_COPY;
  }

  return null;
}
