"use client";

import { useActionState, useEffect, useRef, useState, type ChangeEvent } from "react";
import type { Category } from "@prisma/client";
import { createProductAction, updateProductFormAction } from "@/app/actions/admin";
import { AdminSubmitButton } from "@/components/admin/admin-submit-button";
import { Button } from "@/components/ui/button";
import { ProductImageFrame } from "@/components/ui/product-image-frame";
import { calculateUnitFinancials } from "@/lib/commerce/finance";
import {
  getTechnicalAttributeDefinitionsForCategorySlug,
  getTechnicalAttributeHint,
  getTechnicalAttributeLabel,
  getTechnicalAttributePlaceholder,
} from "@/lib/configurator/technical-attributes";
import { locales, type AppLocale } from "@/lib/constants";
import { cn, slugify } from "@/lib/utils";

type TranslationValues = Record<
  AppLocale,
  {
    name: string;
    shortDescription: string;
    description: string;
    seoTitle: string;
    seoDescription: string;
  }
>;

type SpecRow = {
  key: string;
  value: string;
};

type TechnicalAttributeValues = Record<string, string>;

type ProductActionState = {
  status: "idle" | "error";
  message?: string;
};

type GalleryItem = {
  token: string;
  src: string;
  source: "existing" | "uploaded";
};

type ProductFormInitialValues = {
  productId?: string;
  slug: string;
  sku: string;
  categoryId: string;
  status: string;
  price: number;
  purchasePrice: number | null;
  oldPrice: number | null;
  currency: string;
  inventoryStatus: string;
  stock: number;
  heroImage: string;
  gallery: string[];
  metadata: string;
  translations: TranslationValues;
  specs: SpecRow[];
  technicalAttributes: TechnicalAttributeValues;
};

function getLocaleCopy(locale: AppLocale) {
  if (locale === "uk") {
    return {
      coreTitle: "Параметри товару",
      managerHint:
        "Спочатку оберіть категорію, SKU та ціну, потім заповніть назву й опис — slug підставиться сам. Технічні поля та JSON потрібні лише для складних товарів.",
      save: "Зберегти товар",
      saving: "Збереження...",
      slugLabel: "Адреса сторінки",
      slugPlaceholder: "Наприклад: asus-rog-strix-b650e-e",
      slugHint:
        "Це частина посилання на товар. Якщо залишити поле порожнім, адреса згенерується з назви.",
      skuLabel: "SKU / артикул",
      skuPlaceholder: "Наприклад: MB-ASUS-B650E",
      statusLabel: "Статус",
      categoryLabel: "Категорія",
      categoryPlaceholder: "Виберіть категорію",
      inventoryLabel: "Наявність",
      priceLabel: "Ціна",
      purchasePriceLabel: "Закупівля",
      oldPriceLabel: "Стара ціна",
      currencyLabel: "Валюта",
      stockLabel: "Кількість",
      financeTitle: "Фінансовий сигнал",
      unitProfitLabel: "Прибуток з одиниці",
      marginLabel: "Маржа",
      financeMissingCost: "Додайте закупівельну ціну, щоб бачити маржу та прибуток.",
      translationsTitle: "Локалізований контент",
      nameLabel: "Назва",
      shortDescriptionLabel: "Короткий опис",
      descriptionLabel: "Повний опис",
      seoTitleLabel: "SEO-заголовок",
      seoDescriptionLabel: "SEO-опис",
      mediaTitle: "Фотографії товару",
      mediaHint:
        "Головне фото використовується в картці товару. Галерея показується на storefront у вибраному порядку.",
      heroUploadLabel: "Замінити головне фото",
      heroUploadHint:
        "Завантажте окреме головне фото або оберіть будь-яке з галереї як основне.",
      clearHero: "Скасувати нове головне фото",
      galleryTitle: "Галерея",
      galleryHint:
        "Можна додати кілька фото, змінювати їх порядок, прибирати окремі зображення та вибирати головне.",
      addGalleryLabel: "Додати фото до галереї",
      emptyGallery: "Поки що немає фото галереї.",
      makeHero: "Зробити головним",
      currentHero: "Головне фото",
      moveLeft: "Лівіше",
      moveRight: "Правіше",
      removeImage: "Прибрати",
      specsTitle: "Характеристики",
      specsHint:
        "Додавайте стільки характеристик, скільки потрібно. Storefront покаже їх без жорсткого ліміту.",
      addSpec: "Додати характеристику",
      specKeyPlaceholder: "Наприклад: чипсет",
      specValuePlaceholder: "Наприклад: B650E",
      metadataTitle: "Додаткові дані",
      metadataOptional: "необов'язково",
      metadataLabel: "JSON metadata",
      metadataHint:
        "Необов'язкове поле для службових або інтеграційних даних. Якщо не потрібно, залиште порожнім або {}.",
      removeSpec: "Видалити",
      draft: "Чернетка",
      published: "Опубліковано",
      archived: "Архів",
      inStock: "В наявності",
      lowStock: "Мало на складі",
      outOfStock: "Немає в наявності",
      preorder: "Передзамовлення",
      technicalTitle: "Технічні атрибути для configurator",
      technicalHint:
        "Ці поля зберігаються як machine-readable дані для configurator і майбутнього compatibility engine.",
      technicalEmpty:
        "Для цієї категорії окремі configurator-атрибути поки не потрібні.",
    };
  }

  if (locale === "ru") {
    return {
      coreTitle: "Параметры товара",
      managerHint:
        "Сначала выберите категорию, SKU и цену, затем название и описание — slug подставится сам. Технические поля и JSON нужны только для сложных позиций.",
      save: "Сохранить товар",
      saving: "Сохранение...",
      slugLabel: "Адрес страницы",
      slugPlaceholder: "Например: asus-rog-strix-b650e-e",
      slugHint:
        "Это часть ссылки на товар. Если оставить поле пустым, адрес сгенерируется из названия.",
      skuLabel: "SKU / артикул",
      skuPlaceholder: "Например: MB-ASUS-B650E",
      statusLabel: "Статус",
      categoryLabel: "Категория",
      categoryPlaceholder: "Выберите категорию",
      inventoryLabel: "Наличие",
      priceLabel: "Цена",
      purchasePriceLabel: "Закупка",
      oldPriceLabel: "Старая цена",
      currencyLabel: "Валюта",
      stockLabel: "Количество",
      financeTitle: "Финансовый сигнал",
      unitProfitLabel: "Прибыль с единицы",
      marginLabel: "Маржа",
      financeMissingCost: "Добавьте закупочную цену, чтобы видеть маржу и прибыль.",
      translationsTitle: "Локализованный контент",
      nameLabel: "Название",
      shortDescriptionLabel: "Краткое описание",
      descriptionLabel: "Полное описание",
      seoTitleLabel: "SEO-заголовок",
      seoDescriptionLabel: "SEO-описание",
      mediaTitle: "Фотографии товара",
      mediaHint:
        "Главное фото используется в карточке товара. Галерея показывается на storefront в выбранном порядке.",
      heroUploadLabel: "Заменить главное фото",
      heroUploadHint:
        "Загрузите отдельное главное фото или выберите любое изображение из галереи как основное.",
      clearHero: "Отменить новое главное фото",
      galleryTitle: "Галерея",
      galleryHint:
        "Можно добавить несколько фото, менять их порядок, удалять отдельные изображения и выбирать главное.",
      addGalleryLabel: "Добавить фото в галерею",
      emptyGallery: "Фотографии галереи пока не добавлены.",
      makeHero: "Сделать главным",
      currentHero: "Главное фото",
      moveLeft: "Левее",
      moveRight: "Правее",
      removeImage: "Убрать",
      specsTitle: "Характеристики",
      specsHint:
        "Добавляйте столько характеристик, сколько нужно. Storefront покажет их без жёсткого лимита.",
      addSpec: "Добавить характеристику",
      specKeyPlaceholder: "Например: чипсет",
      specValuePlaceholder: "Например: B650E",
      metadataTitle: "Дополнительные данные",
      metadataOptional: "необязательно",
      metadataLabel: "JSON metadata",
      metadataHint:
        "Необязательное поле для служебных или интеграционных данных. Если не нужно, оставьте пустым или {}.",
      removeSpec: "Удалить",
      draft: "Черновик",
      published: "Опубликовано",
      archived: "Архив",
      inStock: "В наличии",
      lowStock: "Мало на складе",
      outOfStock: "Нет в наличии",
      preorder: "Предзаказ",
      technicalTitle: "Технические атрибуты для configurator",
      technicalHint:
        "Эти поля сохраняются как machine-readable данные для configurator и будущего compatibility engine.",
      technicalEmpty:
        "Для этой категории отдельные configurator-атрибуты пока не нужны.",
    };
  }

  return {
    coreTitle: "Product details",
    managerHint:
      "Pick category, SKU, and price first, then names and descriptions — the slug fills in automatically. Technical fields and JSON are only for advanced SKUs.",
    save: "Save product",
    saving: "Saving...",
    slugLabel: "Page address",
    slugPlaceholder: "For example: asus-rog-strix-b650e-e",
    slugHint:
      "This becomes part of the product URL. Leave it empty and the address will be generated from the name.",
    skuLabel: "SKU",
    skuPlaceholder: "For example: MB-ASUS-B650E",
    statusLabel: "Status",
    categoryLabel: "Category",
    categoryPlaceholder: "Select a category",
    inventoryLabel: "Availability",
    priceLabel: "Price",
    purchasePriceLabel: "Purchase cost",
    oldPriceLabel: "Previous price",
    currencyLabel: "Currency",
    stockLabel: "Stock",
    financeTitle: "Financial snapshot",
    unitProfitLabel: "Unit profit",
    marginLabel: "Margin",
    financeMissingCost: "Add a purchase cost to unlock margin and profit calculations.",
    translationsTitle: "Localized content",
    nameLabel: "Name",
    shortDescriptionLabel: "Short description",
    descriptionLabel: "Full description",
    seoTitleLabel: "SEO title",
    seoDescriptionLabel: "SEO description",
    mediaTitle: "Product images",
    mediaHint:
      "The main image is used across the product card. Gallery images appear on the storefront in the selected order.",
    heroUploadLabel: "Replace the main image",
    heroUploadHint:
      "Upload a dedicated main image or choose any gallery image as the primary one.",
    clearHero: "Remove the new main image",
    galleryTitle: "Gallery",
    galleryHint:
      "Add multiple photos, change their order, remove individual images, and mark any image as the main one.",
    addGalleryLabel: "Add gallery images",
    emptyGallery: "No gallery images yet.",
    makeHero: "Set as main",
    currentHero: "Main image",
    moveLeft: "Move left",
    moveRight: "Move right",
    removeImage: "Remove",
    specsTitle: "Specifications",
    specsHint:
      "Add as many specifications as you need. The storefront will render the full list without a fixed cap.",
    addSpec: "Add spec",
    specKeyPlaceholder: "For example: chipset",
    specValuePlaceholder: "For example: B650E",
    metadataTitle: "Additional data",
    metadataOptional: "optional",
    metadataLabel: "Metadata JSON",
    metadataHint:
      "Optional field for service or integration data. Leave it empty or use {} if you do not need it.",
    removeSpec: "Remove",
    draft: "Draft",
    published: "Published",
    archived: "Archived",
    inStock: "In stock",
    lowStock: "Low stock",
    outOfStock: "Out of stock",
    preorder: "Preorder",
    technicalTitle: "Configurator attributes",
    technicalHint:
      "These fields are stored as machine-readable technical data for the configurator and future compatibility rules.",
    technicalEmpty:
      "This category does not need dedicated configurator attributes right now.",
  };
}

function createPendingToken() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `pending:${crypto.randomUUID()}`;
  }

  return `pending:${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildInitialGalleryItems(initialValues?: ProductFormInitialValues) {
  const orderedSources = Array.from(
    new Set([initialValues?.heroImage ?? "", ...(initialValues?.gallery ?? [])].filter(Boolean)),
  );

  return orderedSources.map((src, index) => ({
    token: `existing:${index}:${src}`,
    src,
    source: "existing" as const,
  }));
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  if (toIndex < 0 || toIndex >= items.length || fromIndex === toIndex) {
    return items;
  }

  const next = [...items];
  const [current] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, current);
  return next;
}

function formatDisplayCurrency(value: number, locale: AppLocale) {
  const normalizedLocale =
    locale === "uk" ? "uk-UA" : locale === "ru" ? "ru-RU" : "en-US";

  return new Intl.NumberFormat(normalizedLocale, {
    style: "currency",
    currency: "UAH",
    maximumFractionDigits: 0,
  }).format(value);
}

async function uploadProductImages(files: File[]) {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append("files", file);
  });

  const response = await fetch("/api/admin/product-images", {
    method: "POST",
    body: formData,
    credentials: "same-origin",
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        error?: string;
        files?: Array<{
          path: string;
          originalName: string;
        }>;
      }
    | null;

  if (!response.ok || !payload?.files) {
    throw new Error(payload?.error || "Upload failed");
  }

  return payload.files;
}

async function deleteUploadedProductImages(paths: string[]) {
  if (paths.length === 0) {
    return;
  }

  await fetch("/api/admin/product-images", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
    body: JSON.stringify({ paths }),
  });
}

export function AdminProductForm({
  locale,
  canViewFinancials = true,
  categories,
  initialValues,
}: {
  locale: string;
  canViewFinancials?: boolean;
  categories: Array<
    Category & {
      translations: Array<{
        locale: string;
        name: string;
      }>;
    }
  >;
  initialValues?: ProductFormInitialValues;
}) {
  const resolvedLocale = (locales.includes(locale as AppLocale) ? locale : "uk") as AppLocale;
  const copy = getLocaleCopy(resolvedLocale);
  const action = initialValues?.productId ? updateProductFormAction : createProductAction;
  const [state, formAction] = useActionState<ProductActionState, FormData>(action, {
    status: "idle",
  });
  const [activeLocale, setActiveLocale] = useState<AppLocale>("uk");
  const [priceInput, setPriceInput] = useState(initialValues?.price ?? 0);
  const [purchasePriceInput, setPurchasePriceInput] = useState<number | null>(
    initialValues?.purchasePrice ?? null,
  );
  const [specs, setSpecs] = useState<SpecRow[]>(
    initialValues?.specs.length ? initialValues.specs : [{ key: "", value: "" }],
  );
  const [translationValues, setTranslationValues] = useState<TranslationValues>(
    initialValues?.translations ??
      ({
        uk: { name: "", shortDescription: "", description: "", seoTitle: "", seoDescription: "" },
        ru: { name: "", shortDescription: "", description: "", seoTitle: "", seoDescription: "" },
        en: { name: "", shortDescription: "", description: "", seoTitle: "", seoDescription: "" },
      } satisfies TranslationValues),
  );
  const [slugValue, setSlugValue] = useState(initialValues?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initialValues?.slug));
  const [selectedCategoryId, setSelectedCategoryId] = useState(initialValues?.categoryId ?? "");
  const [technicalAttributes, setTechnicalAttributes] = useState<TechnicalAttributeValues>(
    initialValues?.technicalAttributes ?? {},
  );
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>(() =>
    buildInitialGalleryItems(initialValues),
  );
  const [heroSelection, setHeroSelection] = useState(() => {
    const items = buildInitialGalleryItems(initialValues);
    const heroMatch = items.find((item) => item.src === initialValues?.heroImage);
    return heroMatch?.token ?? items[0]?.token ?? "";
  });
  const [heroPreviewUrl, setHeroPreviewUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isHeroUploading, setIsHeroUploading] = useState(false);
  const [isGalleryUploading, setIsGalleryUploading] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const heroInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (slugTouched) {
      return;
    }

    const generated = slugify(
      translationValues[resolvedLocale].name ||
        translationValues.uk.name ||
        translationValues.ru.name ||
        translationValues.en.name,
    );
    setSlugValue(generated);
  }, [resolvedLocale, slugTouched, translationValues]);

  const updateSpec = (index: number, field: keyof SpecRow, value: string) => {
    setSpecs((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)),
    );
  };

  const updateTranslation = (
    targetLocale: AppLocale,
    field: keyof TranslationValues[AppLocale],
    value: string,
  ) => {
    setTranslationValues((current) => ({
      ...current,
      [targetLocale]: {
        ...current[targetLocale],
        [field]: value,
      },
    }));
  };

  const handleSlugChange = (value: string) => {
    const normalized = slugify(value);
    setSlugTouched(normalized.length > 0);
    setSlugValue(normalized);
  };

  const handleGalleryInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) {
      return;
    }

    setUploadError(null);
    setIsGalleryUploading(true);

    try {
      const uploaded = await uploadProductImages(files);
      setGalleryItems((current) => [
        ...current,
        ...uploaded.map((file) => ({
          token: createPendingToken(),
          src: file.path,
          source: "uploaded" as const,
        })),
      ]);
    } catch {
      setUploadError(
        resolvedLocale === "uk"
          ? "Не вдалося завантажити зображення галереї."
          : resolvedLocale === "ru"
            ? "Не удалось загрузить изображения галереи."
            : "Unable to upload gallery images.",
      );
    } finally {
      setIsGalleryUploading(false);

      if (galleryInputRef.current) {
        galleryInputRef.current.value = "";
      }
    }
  };

  const removeGalleryItem = async (token: string) => {
    const target = galleryItems.find((item) => item.token === token);

    setGalleryItems((current) => {
      const next = current.filter((item) => item.token !== token);
      if (heroSelection === token) {
        setHeroSelection(next[0]?.token ?? "");
      }

      return next;
    });

    if (target?.source === "uploaded") {
      await deleteUploadedProductImages([target.src]);
    }
  };

  const moveGalleryItem = (index: number, direction: -1 | 1) => {
    setGalleryItems((current) => moveItem(current, index, index + direction));
  };

  const setGalleryItemAsHero = (token: string) => {
    setHeroSelection(token);
    setHeroPreviewUrl((current) => {
      if (current) {
        queueMicrotask(() => {
          void deleteUploadedProductImages([current]);
        });
      }

      return null;
    });

    if (heroInputRef.current) {
      heroInputRef.current.value = "";
    }
  };

  const handleHeroInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setUploadError(null);
    setIsHeroUploading(true);

    try {
      const [uploaded] = await uploadProductImages([file]);
      setHeroPreviewUrl((current) => {
        const previousPath = current;
        queueMicrotask(() => {
          if (previousPath && previousPath !== uploaded.path) {
            void deleteUploadedProductImages([previousPath]);
          }
        });
        return uploaded.path;
      });
    } catch {
      setUploadError(
        resolvedLocale === "uk"
          ? "Не вдалося завантажити головне фото."
          : resolvedLocale === "ru"
            ? "Не удалось загрузить главное фото."
            : "Unable to upload the main image.",
      );
    } finally {
      setIsHeroUploading(false);

      if (heroInputRef.current) {
        heroInputRef.current.value = "";
      }
    }
  };

  const clearHeroUpload = async () => {
    const currentHeroUpload = heroPreviewUrl;
    setHeroPreviewUrl(null);

    if (heroInputRef.current) {
      heroInputRef.current.value = "";
    }

    if (currentHeroUpload) {
      await deleteUploadedProductImages([currentHeroUpload]);
    }
  };

  const getCategoryLabel = (category: (typeof categories)[number]) => {
    const localized =
      category.translations.find((item) => item.locale === locale)?.name ??
      category.translations[0]?.name ??
      category.slug;

    if (!category.parentId) {
      return localized;
    }

    const parent = categories.find((item) => item.id === category.parentId);
    const parentLabel =
      parent?.translations.find((item) => item.locale === locale)?.name ??
      parent?.translations[0]?.name ??
      "";

    return parentLabel ? `${parentLabel} / ${localized}` : localized;
  };

  const selectedCategorySlug =
    categories.find((category) => category.id === selectedCategoryId)?.slug ?? null;
  const technicalDefinitions = getTechnicalAttributeDefinitionsForCategorySlug(selectedCategorySlug);
  const unitFinancials = calculateUnitFinancials({
    price: priceInput,
    purchasePrice: purchasePriceInput,
  });

  const currentHeroImage =
    heroPreviewUrl ??
    galleryItems.find((item) => item.token === heroSelection)?.src ??
    initialValues?.heroImage ??
    "";
  const isUploading = isHeroUploading || isGalleryUploading;

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="locale" value={resolvedLocale} />
      <input type="hidden" name="productId" value={initialValues?.productId ?? ""} />
      <input type="hidden" name="heroImagePath" value={currentHeroImage} />
      {galleryItems.map((item) => (
        <input key={item.token} type="hidden" name="galleryAsset" value={item.src} />
      ))}
      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold text-[color:var(--color-text)]">{copy.coreTitle}</h2>
          <AdminSubmitButton pendingLabel={copy.saving} disabled={isUploading}>
            {copy.save}
          </AdminSubmitButton>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--color-text-soft)]">{copy.managerHint}</p>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)] xl:col-span-2">
            <span>{copy.categoryLabel}</span>
            <select
              name="categoryId"
              value={selectedCategoryId}
              onChange={(event) => setSelectedCategoryId(event.target.value)}
              required
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
            >
              <option value="">{copy.categoryPlaceholder}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {getCategoryLabel(category)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{copy.skuLabel}</span>
            <input
              name="sku"
              defaultValue={initialValues?.sku ?? ""}
              placeholder={copy.skuPlaceholder}
              required
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)] xl:col-span-2">
            <span>{copy.slugLabel}</span>
            <input
              name="slug"
              value={slugValue}
              onChange={(event) => handleSlugChange(event.target.value)}
              placeholder={copy.slugPlaceholder}
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
            />
            <span className="text-xs leading-6 text-[color:var(--color-text-soft)]">{copy.slugHint}</span>
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{copy.statusLabel}</span>
            <select
              name="status"
              defaultValue={initialValues?.status ?? "DRAFT"}
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
            >
              <option value="DRAFT">{copy.draft}</option>
              <option value="PUBLISHED">{copy.published}</option>
              <option value="ARCHIVED">{copy.archived}</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{copy.inventoryLabel}</span>
            <select
              name="inventoryStatus"
              defaultValue={initialValues?.inventoryStatus ?? "IN_STOCK"}
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
            >
              <option value="IN_STOCK">{copy.inStock}</option>
              <option value="LOW_STOCK">{copy.lowStock}</option>
              <option value="OUT_OF_STOCK">{copy.outOfStock}</option>
              <option value="PREORDER">{copy.preorder}</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{copy.priceLabel}</span>
            <input
              name="price"
              type="number"
              min="0"
              step="0.01"
              defaultValue={initialValues?.price ?? 0}
              onChange={(event) => setPriceInput(Number(event.target.value) || 0)}
              required
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
            />
          </label>
          {canViewFinancials ? (
            <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
              <span>{copy.purchasePriceLabel}</span>
              <input
                name="purchasePrice"
                type="number"
                min="0"
                step="0.01"
                defaultValue={initialValues?.purchasePrice ?? ""}
                onChange={(event) =>
                  setPurchasePriceInput(
                    event.target.value.trim().length > 0 ? Number(event.target.value) || 0 : null,
                  )
                }
                className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
              />
            </label>
          ) : null}
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{copy.oldPriceLabel}</span>
            <input
              name="oldPrice"
              type="number"
              min="0"
              step="0.01"
              defaultValue={initialValues?.oldPrice ?? ""}
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{copy.currencyLabel}</span>
            <input
              name="currency"
              maxLength={3}
              defaultValue={initialValues?.currency ?? "USD"}
              required
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 uppercase text-[color:var(--color-text)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{copy.stockLabel}</span>
            <input
              name="stock"
              type="number"
              min="0"
              defaultValue={initialValues?.stock ?? 0}
              required
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
            />
          </label>
          {canViewFinancials ? (
            <div className="md:col-span-2 xl:col-span-5 rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4">
              <p className="text-sm font-medium text-[color:var(--color-text)]">{copy.financeTitle}</p>
              {unitFinancials.profitPerUnit === null ? (
                <p className="mt-2 text-sm text-[color:var(--color-text-soft)]">{copy.financeMissingCost}</p>
              ) : (
                <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-text-soft)]">
                      {copy.unitProfitLabel}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-[color:var(--color-text)]">
                      {formatDisplayCurrency(unitFinancials.profitPerUnit, resolvedLocale)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-text-soft)]">
                      {copy.marginLabel}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-[color:var(--color-text)]">
                      {unitFinancials.marginPercent?.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-text-soft)]">
                      {copy.purchasePriceLabel}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-[color:var(--color-text)]">
                      {formatDisplayCurrency(unitFinancials.purchasePrice ?? 0, resolvedLocale)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold text-[color:var(--color-text)]">{copy.translationsTitle}</h2>
          <div className="flex flex-wrap gap-2">
            {locales.map((tabLocale) => (
              <button
                key={tabLocale}
                type="button"
                onClick={() => setActiveLocale(tabLocale)}
                className={
                  activeLocale === tabLocale
                    ? "rounded-full border border-[color:var(--color-accent-line)] bg-[color:var(--color-accent-soft)] px-4 py-2 text-sm font-medium text-[color:var(--color-text)]"
                    : "rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-2 text-sm text-[color:var(--color-text-soft)]"
                }
              >
                {tabLocale.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{copy.nameLabel}</span>
            <input
              name={`name:${activeLocale}`}
              value={translationValues[activeLocale].name}
              onChange={(event) => updateTranslation(activeLocale, "name", event.target.value)}
              required
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{copy.shortDescriptionLabel}</span>
            <textarea
              name={`shortDescription:${activeLocale}`}
              value={translationValues[activeLocale].shortDescription}
              onChange={(event) =>
                updateTranslation(activeLocale, "shortDescription", event.target.value)
              }
              required
              className="min-h-24 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-3 text-[color:var(--color-text)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{copy.descriptionLabel}</span>
            <textarea
              name={`description:${activeLocale}`}
              value={translationValues[activeLocale].description}
              onChange={(event) => updateTranslation(activeLocale, "description", event.target.value)}
              required
              className="min-h-40 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-3 text-[color:var(--color-text)] outline-none"
            />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
              <span>{copy.seoTitleLabel}</span>
              <input
                name={`seoTitle:${activeLocale}`}
                value={translationValues[activeLocale].seoTitle}
                onChange={(event) => updateTranslation(activeLocale, "seoTitle", event.target.value)}
                className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
              />
            </label>
            <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
              <span>{copy.seoDescriptionLabel}</span>
              <input
                name={`seoDescription:${activeLocale}`}
                value={translationValues[activeLocale].seoDescription}
                onChange={(event) =>
                  updateTranslation(activeLocale, "seoDescription", event.target.value)
                }
                className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
              />
            </label>
          </div>
        </div>

        {locales
          .filter((tabLocale) => tabLocale !== activeLocale)
          .map((hiddenLocale) => (
            <div key={hiddenLocale} className="hidden">
              <input name={`name:${hiddenLocale}`} value={translationValues[hiddenLocale].name} readOnly />
              <textarea name={`shortDescription:${hiddenLocale}`} value={translationValues[hiddenLocale].shortDescription} readOnly />
              <textarea name={`description:${hiddenLocale}`} value={translationValues[hiddenLocale].description} readOnly />
              <input name={`seoTitle:${hiddenLocale}`} value={translationValues[hiddenLocale].seoTitle} readOnly />
              <input name={`seoDescription:${hiddenLocale}`} value={translationValues[hiddenLocale].seoDescription} readOnly />
            </div>
          ))}
      </section>

      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-[color:var(--color-text)]">{copy.mediaTitle}</h2>
          <p className="max-w-3xl text-sm leading-7 text-[color:var(--color-text-soft)]">{copy.mediaHint}</p>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-[1.6rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] p-4">
              {currentHeroImage ? (
                <ProductImageFrame src={currentHeroImage} alt="Hero image preview" className="bg-white/90 shadow-none" />
              ) : (
                <div className="aspect-square rounded-[1.2rem] border border-dashed border-[color:var(--color-line)]" />
              )}
              <div className="mt-4 space-y-2">
                <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
                  <span>{copy.heroUploadLabel}</span>
                  <input
                    ref={heroInputRef}
                    name="heroImageFile"
                    type="file"
                    accept="image/*"
                    onChange={handleHeroInputChange}
                    className="rounded-[1rem] border border-dashed border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-4 text-[color:var(--color-text-soft)]"
                  />
                </label>
                <p className="text-xs leading-6 text-[color:var(--color-text-soft)]">{copy.heroUploadHint}</p>
                {isHeroUploading ? (
                  <p className="text-xs leading-6 text-[color:var(--color-text-soft)]">{copy.saving}</p>
                ) : null}
                {heroPreviewUrl ? (
                  <Button type="button" variant="ghost" className="h-9 px-0 text-xs" onClick={clearHeroUpload}>
                    {copy.clearHero}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-[color:var(--color-text)]">{copy.galleryTitle}</h3>
              <p className="text-sm leading-7 text-[color:var(--color-text-soft)]">{copy.galleryHint}</p>
            </div>

            {galleryItems.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {galleryItems.map((item, index) => {
                  const isHero = item.token === heroSelection && !heroPreviewUrl;

                  return (
                    <div
                      key={item.token}
                      className={cn(
                        "rounded-[1.4rem] border bg-[color:var(--color-surface-elevated)] p-3 transition",
                        isHero
                          ? "border-[color:var(--color-accent-line)] shadow-[0_16px_30px_rgba(24,184,255,0.12)]"
                          : "border-[color:var(--color-line)]",
                      )}
                    >
                      <ProductImageFrame src={item.src} alt={`Gallery ${index + 1}`} className="bg-white/90 shadow-none" />
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant={isHero ? "primary" : "secondary"}
                          className="h-9 px-3 text-xs"
                          onClick={() => setGalleryItemAsHero(item.token)}
                        >
                          {isHero ? copy.currentHero : copy.makeHero}
                        </Button>
                        <Button type="button" variant="ghost" className="h-9 px-3 text-xs" onClick={() => moveGalleryItem(index, -1)} disabled={index === 0}>
                          {copy.moveLeft}
                        </Button>
                        <Button type="button" variant="ghost" className="h-9 px-3 text-xs" onClick={() => moveGalleryItem(index, 1)} disabled={index === galleryItems.length - 1}>
                          {copy.moveRight}
                        </Button>
                        <Button type="button" variant="ghost" className="h-9 px-3 text-xs" onClick={() => removeGalleryItem(item.token)}>
                          {copy.removeImage}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[1.4rem] border border-dashed border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-5 text-sm text-[color:var(--color-text-soft)]">
                {copy.emptyGallery}
              </div>
            )}

            <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
              <span>{copy.addGalleryLabel}</span>
              <input
                ref={galleryInputRef}
                name="galleryFiles"
                type="file"
                accept="image/*"
                multiple
                onChange={handleGalleryInputChange}
                className="rounded-[1rem] border border-dashed border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4 text-[color:var(--color-text-soft)]"
              />
            </label>
            {isGalleryUploading ? (
              <p className="text-xs leading-6 text-[color:var(--color-text-soft)]">{copy.saving}</p>
            ) : null}
            {uploadError ? (
              <p className="rounded-[1rem] border border-rose-500/20 bg-rose-500/8 px-3 py-2 text-xs text-rose-300">
                {uploadError}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-[color:var(--color-text)]">{copy.technicalTitle}</h2>
          <p className="max-w-3xl text-sm leading-7 text-[color:var(--color-text-soft)]">{copy.technicalHint}</p>
        </div>

        {technicalDefinitions.length > 0 ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {technicalDefinitions.map((definition) => (
              <label
                key={definition.code}
                className={cn(
                  "grid gap-2 text-sm text-[color:var(--color-text-soft)]",
                  definition.fieldType === "list" ? "md:col-span-2 xl:col-span-3" : "",
                )}
              >
                <span>
                  {getTechnicalAttributeLabel(definition, resolvedLocale)}
                  {definition.unit ? `, ${definition.unit}` : ""}
                </span>
                {definition.fieldType === "list" ? (
                  <textarea
                    name={`technical:${definition.code}`}
                    value={technicalAttributes[definition.code] ?? ""}
                    onChange={(event) =>
                      setTechnicalAttributes((current) => ({
                        ...current,
                        [definition.code]: event.target.value,
                      }))
                    }
                    placeholder={getTechnicalAttributePlaceholder(definition, resolvedLocale)}
                    className="min-h-24 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-3 text-[color:var(--color-text)] outline-none"
                  />
                ) : (
                  <input
                    name={`technical:${definition.code}`}
                    type={definition.fieldType === "number" ? "number" : "text"}
                    min={definition.fieldType === "number" ? "0" : undefined}
                    step={definition.fieldType === "number" ? "1" : undefined}
                    value={technicalAttributes[definition.code] ?? ""}
                    onChange={(event) =>
                      setTechnicalAttributes((current) => ({
                        ...current,
                        [definition.code]: event.target.value,
                      }))
                    }
                    placeholder={getTechnicalAttributePlaceholder(definition, resolvedLocale)}
                    className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
                  />
                )}
                {getTechnicalAttributeHint(definition, resolvedLocale) ? (
                  <span className="text-xs leading-6 text-[color:var(--color-text-soft)]">
                    {getTechnicalAttributeHint(definition, resolvedLocale)}
                  </span>
                ) : null}
              </label>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-[1.4rem] border border-dashed border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-5 text-sm text-[color:var(--color-text-soft)]">
            {copy.technicalEmpty}
          </div>
        )}
      </section>

      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-[color:var(--color-text)]">{copy.specsTitle}</h2>
            <p className="max-w-3xl text-sm leading-7 text-[color:var(--color-text-soft)]">{copy.specsHint}</p>
          </div>
          <Button type="button" variant="secondary" onClick={() => setSpecs((current) => [...current, { key: "", value: "" }])}>
            {copy.addSpec}
          </Button>
        </div>
        <div className="mt-6 grid gap-3">
          {specs.map((spec, index) => (
            <div key={`${index}-${spec.key}`} className="grid gap-3 md:grid-cols-[0.95fr_1.05fr_auto]">
              <input
                name="specKey"
                value={spec.key}
                onChange={(event) => updateSpec(index, "key", event.target.value)}
                placeholder={copy.specKeyPlaceholder}
                className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
              />
              <input
                name="specValue"
                value={spec.value}
                onChange={(event) => updateSpec(index, "value", event.target.value)}
                placeholder={copy.specValuePlaceholder}
                className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
              />
              <Button type="button" variant="ghost" onClick={() => setSpecs((current) => current.filter((_, rowIndex) => rowIndex !== index))}>
                {copy.removeSpec}
              </Button>
            </div>
          ))}
        </div>
      </section>

      <details className="group rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
        <summary className="cursor-pointer list-none text-2xl font-semibold text-[color:var(--color-text)] marker:content-none">
          <span className="inline-flex items-center gap-2">
            {copy.metadataTitle}
            <span className="text-sm font-normal text-[color:var(--color-text-soft)]">({copy.metadataOptional})</span>
          </span>
        </summary>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--color-text-soft)]">{copy.metadataHint}</p>
        <label className="mt-4 grid gap-2 text-sm text-[color:var(--color-text-soft)]">
          <span>{copy.metadataLabel}</span>
          <textarea
            name="metadata"
            defaultValue={initialValues?.metadata ?? "{}"}
            className="min-h-32 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-3 font-mono text-xs text-[color:var(--color-text)] outline-none"
          />
        </label>
      </details>

      {state.message ? (
        <p className="rounded-[1.2rem] border border-rose-500/20 bg-rose-500/8 px-4 py-3 text-sm text-rose-300">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
