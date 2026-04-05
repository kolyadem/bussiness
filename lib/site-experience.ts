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

const PC_BUILD_EXPERIENCE_COPY: Record<AppLocale, ExperienceCopy> = {
  uk: {
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
  },
  ru: {
    navCatalog: "Комплектующие",
    navConfigurator: "Конфигуратор ПК",
    heroBadge: "конфигуратор ПК",
    heroPrimary: "Получить подборку сборки",
    heroSecondary: "Открыть конфигуратор",
    featuredTitle: "Комплектующие для сборки",
    catalogTitle: "Комплектующие и апгрейд",
    serviceTitle: "С чем мы поможем",
    serviceText: "",
    serviceCards: [
      {
        title: "Игровые ПК",
        text: "Подберём сборку под ваши жанры, разрешение и желаемый FPS без лишнего шума.",
      },
      {
        title: "ПК для работы и учёбы",
        text: "Конфигурации для монтажа, дизайна, офиса и повседневных задач с запасом на рост.",
      },
      {
        title: "Апгрейд и консультация",
        text: "Поможем понять, что стоит обновить сейчас, а что лучше оставить на следующий этап.",
      },
    ],
    emptyCart:
      "Здесь появятся комплектующие и решения, которые вы хотите обсудить или оформить в подбор.",
    emptyWishlist:
      "Сохраняйте интересные комплектующие и идеи для будущей сборки в одном месте.",
    emptyCompare:
      "Добавляйте комплектующие в сравнение, чтобы спокойно сверить характеристики перед сборкой.",
    productActionPanelTitle: "Следующий шаг",
    productActionPanelBody:
      "Добавьте компонент в сценарий сборки или перейдите в конфигуратор, чтобы собрать ПК под свои задачи.",
    addToBuild: "Добавить в сборку",
    discussBuild: "Обсудить конфигурацию",
  },
  en: {
    navCatalog: "Components",
    navConfigurator: "PC Configurator",
    heroBadge: "PC configurator",
    heroPrimary: "Get a build recommendation",
    heroSecondary: "Open configurator",
    featuredTitle: "Components for custom builds",
    catalogTitle: "Components and upgrade options",
    serviceTitle: "How we can help",
    serviceText: "",
    serviceCards: [
      {
        title: "Gaming PCs",
        text: "We tailor the build to your games, target resolution, and performance expectations without overcomplicating the choice.",
      },
      {
        title: "PCs for work and study",
        text: "Balanced configurations for editing, design, office work, and everyday tasks with room to grow.",
      },
      {
        title: "Upgrade and consultation",
        text: "We help you decide what is worth upgrading now and what can wait for the next step.",
      },
    ],
    emptyCart:
      "This is where selected components and curated options will appear when you are ready to discuss or request a build.",
    emptyWishlist:
      "Save promising components and ideas for the build you want to shape next.",
    emptyCompare:
      "Add components to compare so you can review the trade-offs before locking the build in.",
    productActionPanelTitle: "Next step",
    productActionPanelBody:
      "Add this component into a build flow or jump into the configurator to shape a PC around your goals.",
    addToBuild: "Add to build",
    discussBuild: "Discuss configuration",
  },
};

export function getSiteExperienceCopy(locale: AppLocale, siteMode: SiteMode) {
  if (siteMode === SITE_MODES.pcBuild) {
    return PC_BUILD_EXPERIENCE_COPY[locale];
  }

  return null;
}
