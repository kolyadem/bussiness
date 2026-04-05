import type { AppLocale } from "@/lib/constants";
import { parseJson } from "@/lib/utils";

export const BUILD_REQUEST_STATUSES = [
  "NEW",
  "IN_REVIEW",
  "COMPLETED",
  "REJECTED",
] as const;

export type BuildRequestStatus = (typeof BUILD_REQUEST_STATUSES)[number];

export const BUILD_REQUEST_DELIVERY_METHODS = [
  "NOVA_POSHTA_BRANCH",
  "NOVA_POSHTA_COURIER",
] as const;

export type BuildRequestDeliveryMethod = (typeof BUILD_REQUEST_DELIVERY_METHODS)[number];

export type BuildRequestSnapshotItem = {
  slot: string;
  slotLabel: string;
  quantity: number;
  productId: string;
  productSlug: string;
  productName: string;
  heroImage: string;
  brandName: string;
  price: number;
  currency: string;
};

export const UKRAINE_CITY_OPTIONS = [
  "Київ",
  "Харків",
  "Одеса",
  "Дніпро",
  "Львів",
  "Запоріжжя",
  "Кривий Ріг",
  "Миколаїв",
  "Вінниця",
  "Чернігів",
  "Полтава",
  "Черкаси",
  "Хмельницький",
  "Житомир",
  "Суми",
  "Чернівці",
  "Рівне",
  "Івано-Франківськ",
  "Тернопіль",
  "Кропивницький",
  "Луцьк",
  "Ужгород",
  "Херсон",
  "Біла Церква",
  "Бровари",
  "Бориспіль",
  "Ірпінь",
  "Буча",
  "Вишневе",
  "Павлоград",
  "Кременчук",
  "Кам'янське",
  "Нікополь",
  "Мелітополь",
  "Бердянськ",
  "Краматорськ",
  "Слов'янськ",
  "Маріуполь",
  "Костянтинівка",
  "Сєвєродонецьк",
  "Лисичанськ",
  "Умань",
  "Бучач",
  "Дрогобич",
  "Стрий",
  "Трускавець",
  "Коломия",
  "Калуш",
  "Мукачево",
  "Берегове",
  "Ковель",
  "Нововолинськ",
  "Ромни",
  "Шостка",
  "Прилуки",
  "Ніжин",
  "Олександрія",
  "Конотоп",
  "Обухів",
] as const;

function normalizeCityValue(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("uk-UA");
}

export function isBuildRequestStatus(value: string): value is BuildRequestStatus {
  return BUILD_REQUEST_STATUSES.includes(value as BuildRequestStatus);
}

export function isBuildRequestDeliveryMethod(value: string): value is BuildRequestDeliveryMethod {
  return BUILD_REQUEST_DELIVERY_METHODS.includes(value as BuildRequestDeliveryMethod);
}

export function isSupportedUkraineCity(value: string) {
  const normalized = normalizeCityValue(value);
  return UKRAINE_CITY_OPTIONS.some((city) => normalizeCityValue(city) === normalized);
}

export function resolveUkraineCity(value: string) {
  const normalized = normalizeCityValue(value);
  return UKRAINE_CITY_OPTIONS.find((city) => normalizeCityValue(city) === normalized) ?? value.trim();
}

export function getBuildRequestNumber(id: string) {
  return `LM-${id.slice(-6).toUpperCase()}`;
}

export function getBuildRequestStatusLabel(status: BuildRequestStatus, locale: AppLocale) {
  switch (status) {
    case "NEW":
      return locale === "uk" ? "Нова" : locale === "ru" ? "Новая" : "New";
    case "IN_REVIEW":
      return locale === "uk" ? "В обробці" : locale === "ru" ? "На рассмотрении" : "In review";
    case "COMPLETED":
      return locale === "uk" ? "Виконана" : locale === "ru" ? "Выполнена" : "Completed";
    case "REJECTED":
      return locale === "uk" ? "Відхилена" : locale === "ru" ? "Отклонена" : "Rejected";
  }
}

export function getBuildRequestDeliveryMethodLabel(
  method: BuildRequestDeliveryMethod,
  locale: AppLocale,
) {
  switch (method) {
    case "NOVA_POSHTA_BRANCH":
      return locale === "uk"
        ? "Нова пошта, відділення"
        : locale === "ru"
          ? "Новая почта, отделение"
          : "Nova Poshta branch";
    case "NOVA_POSHTA_COURIER":
      return locale === "uk"
        ? "Кур'єр Нової пошти"
        : locale === "ru"
          ? "Курьер Новой почты"
          : "Nova Poshta courier";
  }
}

export function getBuildRequestStatusTone(status: BuildRequestStatus) {
  switch (status) {
    case "NEW":
      return "bg-sky-500/12 text-sky-500 ring-1 ring-sky-500/15";
    case "IN_REVIEW":
      return "bg-amber-400/12 text-amber-500 ring-1 ring-amber-400/15";
    case "COMPLETED":
      return "bg-emerald-500/12 text-emerald-500 ring-1 ring-emerald-500/15";
    case "REJECTED":
      return "bg-rose-500/12 text-rose-500 ring-1 ring-rose-500/15";
  }
}

export function getBuildRequestBooleanLabel(value: boolean, locale: AppLocale) {
  return value
    ? locale === "uk"
      ? "Так"
      : locale === "ru"
        ? "Да"
        : "Yes"
    : locale === "uk"
      ? "Ні"
      : locale === "ru"
        ? "Нет"
        : "No";
}

export function parseBuildRequestItemsSnapshot(value: string) {
  return parseJson<BuildRequestSnapshotItem[]>(value, []).filter(
    (item) =>
      item &&
      typeof item === "object" &&
      typeof item.productId === "string" &&
      typeof item.productName === "string",
  );
}
