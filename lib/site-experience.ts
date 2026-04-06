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
      text: "Підберемо збірку під ваші жанри, роздільну здатність і бажаний FPS без зайвого шуму.",
    },
    {
      title: "ПК для роботи й навчання",
      text: "Конфігурації для монтажу, дизайну, офісу та щоденних задач із запасом на ріст.",
    },
    {
      title: "Апгрейд і консультація",
      text: "Допоможемо зрозуміти, що варто оновити зараз, а що краще залишити на наступний етап.",
    },
  ],
  emptyCart:
    "Тут з’являться комплектуючі та готові рішення, які ви хочете обговорити або оформити в підбір.",
  emptyWishlist:
    "Зберігайте цікаві комплектуючі та ідеї для майбутньої збірки в одному місці.",
  emptyCompare:
    "Додавайте комплектуючі в порівняння, щоб спокійно звірити характеристики перед збіркою.",
  productActionPanelTitle: "Наступний крок",
  productActionPanelBody:
    "Додайте компонент у сценарій збірки або перейдіть до конфігуратора, щоб зібрати ПК під свої задачі.",
  addToBuild: "Додати у збірку",
  discussBuild: "Обговорити конфігурацію",
};

export function getSiteExperienceCopy(_locale: AppLocale, siteMode: SiteMode) {
  if (siteMode === SITE_MODES.pcBuild) {
    return PC_BUILD_EXPERIENCE_COPY;
  }

  return null;
}
