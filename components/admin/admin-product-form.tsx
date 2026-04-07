"use client";

import { useActionState, useEffect, useRef, useState, type ChangeEvent } from "react";
import { usePathname } from "next/navigation";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import type { Category } from "@prisma/client";
import { createProductAction, updateProductFormAction } from "@/app/actions/admin";
import { AdminSubmitButton } from "@/components/admin/admin-submit-button";
import { Button } from "@/components/ui/button";
import { ProductImageFrame } from "@/components/ui/product-image-frame";
import { calculateUnitFinancials } from "@/lib/commerce/finance";
import {
  getSpecSuggestionLabelsForCategorySlug,
  getTechnicalAttributeDefinitionsForCategorySlug,
  getTechnicalAttributeHint,
  getTechnicalAttributeLabel,
  getTechnicalAttributePlaceholder,
} from "@/lib/configurator/technical-attributes";
import { defaultLocale, type AppLocale } from "@/lib/constants";
import { cn, parseJson, slugify, STOREFRONT_CURRENCY_CODE } from "@/lib/utils";

type TranslationFields = {
  name: string;
  shortDescription: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
};

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
  translations: TranslationFields;
  specs: SpecRow[];
  technicalAttributes: TechnicalAttributeValues;
};

const PRODUCT_FORM_COPY = {
  coreTitle: "Основне",
  managerHint:
    "Спочатку назва й категорія, потім фото та опис. Slug згенерується з назви, якщо залишити поле порожнім.",
  save: "Зберегти товар",
  saveBottom: "Зберегти зміни",
  saveAndAddAnother: "Зберегти і додати ще один",
  saving: "Збереження...",
  toastCreated: "Товар створено",
  toastSaved: "Зміни збережено",
  toastSavedAndNext: "Товар збережено. Можете додати наступний.",
  shortOptionalHint: "Необов'язково: якщо порожньо, підставимо короткий текст із назви.",
  detailsMoreParams: "Додаткові параметри (SKU, залишок, статус…)",
  detailsDescriptionSeo: "Повний опис і SEO",
  skuOptionalHint: "Можна залишити порожнім — згенеруємо службовий артикул автоматично.",
  autoHeroFromGalleryHint:
    "Перше фото в галереї стає головним автоматично; можна обрати інше кнопкою «Зробити головним».",
  specsCategoryHintIntro: "Для цієї категорії зазвичай корисно вказати:",
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
  descriptionSectionHint:
    "Повний текст для картки товару. SEO-поля можна залишити порожніми — тоді підставляться назва й короткий опис.",
  nameLabel: "Назва",
  shortDescriptionLabel: "Короткий опис",
  descriptionLabel: "Повний опис",
  seoTitleLabel: "SEO-заголовок",
  seoDescriptionLabel: "SEO-опис",
  mediaTitle: "Фото",
  mediaHint:
    "Головне фото — у картці каталогу та зверху сторінки товару. Галерея — додаткові знімки у вибраному порядку.",
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
  newHeroBadge: "Нове головне фото (ще не збережено)",
  moveLeft: "Лівіше",
  moveRight: "Правіше",
  removeImage: "Прибрати",
  specsTitle: "Характеристики",
  specsHint:
    "Додавайте стільки характеристик, скільки потрібно. Storefront покаже їх без жорсткого ліміту.",
  addSpec: "Додати характеристику",
  specKeyPlaceholder: "Наприклад: чипсет",
  specValuePlaceholder: "Наприклад: B650E",
  priceTrackingTitle: "Джерела цін",
  priceTrackingHint:
    "Прямі посилання на сторінки Rozetka / Telemart для автоматичного оновлення цін. Якщо URL задано — система використовуватиме його замість евристичного пошуку.",
  priceTrackingRozetkaLabel: "Rozetka URL",
  priceTrackingTelemartLabel: "Telemart URL",
  priceTrackingPlaceholder: "https://...",
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
  technicalEmpty: "Для цієї категорії окремі configurator-атрибути поки не потрібні.",
} as const;

function ProductFormBottomActions({
  isUploading,
  isEdit,
  copy,
}: {
  isUploading: boolean;
  isEdit: boolean;
  copy: typeof PRODUCT_FORM_COPY;
}) {
  const { pending } = useFormStatus();
  const disabled = isUploading || pending;

  return (
    <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)]/95 px-5 py-4 shadow-[var(--shadow-soft)] backdrop-blur supports-[backdrop-filter]:bg-[color:var(--color-surface)]/85">
      <p className="max-w-xl text-sm text-[color:var(--color-text-soft)]">
        {isEdit
          ? "Після змін натисніть збереження — зображення вже в сховищі."
          : "Швидкий старт: назва, категорія, ціна та фото. Решту можна згорнути або заповнити пізніше."}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {!isEdit ? (
          <Button type="submit" name="intent" value="saveAndNew" variant="secondary" disabled={disabled}>
            {copy.saveAndAddAnother}
          </Button>
        ) : null}
        <AdminSubmitButton pendingLabel={copy.saving} disabled={disabled}>
          {isEdit ? copy.saveBottom : copy.save}
        </AdminSubmitButton>
      </div>
    </div>
  );
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

function formatDisplayCurrency(value: number) {
  return new Intl.NumberFormat("uk-UA", {
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

  const text = await response.text();
  type UploadPayload = {
    error?: string;
    files?: Array<{
      path: string;
      originalName: string;
    }>;
  };
  let payload: UploadPayload | null = null;

  try {
    payload = text ? (JSON.parse(text) as UploadPayload) : null;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.files?.length) {
    const fromServer = payload?.error?.trim();
    if (fromServer) {
      throw new Error(fromServer);
    }
    if (response.status === 401) {
      throw new Error("Увійдіть у систему, щоб завантажувати зображення.");
    }
    if (response.status === 403) {
      throw new Error("Недостатньо прав для завантаження файлів.");
    }
    if (response.status === 404) {
      throw new Error("Сервіс завантаження недоступний (маршрут не знайдено). Зверніться до адміністратора.");
    }
    if (response.status >= 500) {
      throw new Error("Сервер тимчасово недоступний. Спробуйте завантажити фото пізніше.");
    }
    throw new Error("Не вдалося завантажити файл. Перевірте з'єднання та спробуйте ще раз.");
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
  const resolvedLocale = defaultLocale;
  const copy = PRODUCT_FORM_COPY;
  const action = initialValues?.productId ? updateProductFormAction : createProductAction;
  const [state, formAction] = useActionState<ProductActionState, FormData>(action, {
    status: "idle",
  });
  const [priceInput, setPriceInput] = useState(initialValues?.price ?? 0);
  const [purchasePriceInput, setPurchasePriceInput] = useState<number | null>(
    initialValues?.purchasePrice ?? null,
  );
  const [specs, setSpecs] = useState<SpecRow[]>(
    initialValues?.specs.length ? initialValues.specs : [{ key: "", value: "" }],
  );
  const [translationValues, setTranslationValues] = useState<TranslationFields>(
    initialValues?.translations ?? {
      name: "",
      shortDescription: "",
      description: "",
      seoTitle: "",
      seoDescription: "",
    },
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
  const [heroUploadError, setHeroUploadError] = useState<string | null>(null);
  const [galleryUploadError, setGalleryUploadError] = useState<string | null>(null);
  const [isHeroUploading, setIsHeroUploading] = useState(false);
  const [isGalleryUploading, setIsGalleryUploading] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const initialPriceTracking = (() => {
    const meta = parseJson<Record<string, unknown>>(initialValues?.metadata ?? "{}", {});
    const pt = (meta.priceTracking ?? {}) as Record<string, unknown>;
    return {
      rozetkaUrl: typeof pt.rozetkaUrl === "string" ? pt.rozetkaUrl : "",
      telemartUrl: typeof pt.telemartUrl === "string" ? pt.telemartUrl : "",
    };
  })();
  const [ptRozetkaUrl, setPtRozetkaUrl] = useState(initialPriceTracking.rozetkaUrl);
  const [ptTelemartUrl, setPtTelemartUrl] = useState(initialPriceTracking.telemartUrl);
  const heroInputRef = useRef<HTMLInputElement | null>(null);
  const pathname = usePathname();
  const saveToastShownRef = useRef(false);

  useEffect(() => {
    if (slugTouched) {
      return;
    }

    const generated = slugify(translationValues.name);
    setSlugValue(generated);
  }, [resolvedLocale, slugTouched, translationValues]);

  useEffect(() => {
    if (heroPreviewUrl) {
      return;
    }
    if (galleryItems.length === 0) {
      return;
    }
    const valid = Boolean(heroSelection && galleryItems.some((item) => item.token === heroSelection));
    if (!valid) {
      setHeroSelection(galleryItems[0].token);
    }
  }, [galleryItems, heroSelection, heroPreviewUrl]);

  useEffect(() => {
    if (saveToastShownRef.current) {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const created = params.get("created");
    const saved = params.get("saved");
    if (saved === "1") {
      toast.success(PRODUCT_FORM_COPY.toastSaved);
      saveToastShownRef.current = true;
      return;
    }
    if (created === "1") {
      toast.success(pathname.endsWith("/new") ? PRODUCT_FORM_COPY.toastSavedAndNext : PRODUCT_FORM_COPY.toastCreated);
      saveToastShownRef.current = true;
    }
  }, [pathname]);

  const updateSpec = (index: number, field: keyof SpecRow, value: string) => {
    setSpecs((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)),
    );
  };

  const updateTranslation = (field: keyof TranslationFields, value: string) => {
    setTranslationValues((current) => ({
      ...current,
      [field]: value,
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

    setGalleryUploadError(null);
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
    } catch (error) {
      setGalleryUploadError(
        error instanceof Error ? error.message : "Не вдалося завантажити зображення галереї.",
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

    setHeroUploadError(null);
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
    } catch (error) {
      setHeroUploadError(
        error instanceof Error ? error.message : "Не вдалося завантажити головне фото.",
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
      category.translations.find((item) => item.locale === defaultLocale)?.name ??
      category.translations[0]?.name ??
      category.slug;

    if (!category.parentId) {
      return localized;
    }

    const parent = categories.find((item) => item.id === category.parentId);
    const parentLabel =
      parent?.translations.find((item) => item.locale === defaultLocale)?.name ??
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

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  const selectedCategoryLabel = selectedCategory ? getCategoryLabel(selectedCategory) : null;
  const specSuggestions = getSpecSuggestionLabelsForCategorySlug(selectedCategorySlug, resolvedLocale);
  const isEdit = Boolean(initialValues?.productId);

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
        <h2 className="text-2xl font-semibold text-[color:var(--color-text)]">{copy.coreTitle}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--color-text-soft)]">{copy.managerHint}</p>

        <div className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{copy.nameLabel}</span>
            <input
              name={`name:${resolvedLocale}`}
              value={translationValues.name}
              onChange={(event) => updateTranslation("name", event.target.value)}
              required
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{copy.shortDescriptionLabel}</span>
            <textarea
              name={`shortDescription:${resolvedLocale}`}
              value={translationValues.shortDescription}
              onChange={(event) =>
                updateTranslation("shortDescription", event.target.value)
              }
              className="min-h-20 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-3 text-[color:var(--color-text)] outline-none"
            />
            <span className="text-xs leading-6 text-[color:var(--color-text-soft)]">{copy.shortOptionalHint}</span>
          </label>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
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
        </div>

        <details className="mt-6 rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-3" open={isEdit}>
          <summary className="cursor-pointer list-none text-sm font-medium text-[color:var(--color-text)] marker:content-none">
            {copy.detailsMoreParams}
          </summary>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)] xl:col-span-2">
              <span>{copy.skuLabel}</span>
              <input
                name="sku"
                defaultValue={initialValues?.sku ?? ""}
                placeholder={copy.skuPlaceholder}
                className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 text-[color:var(--color-text)] outline-none"
              />
              <span className="text-xs leading-6 text-[color:var(--color-text-soft)]">{copy.skuOptionalHint}</span>
            </label>
            <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)] xl:col-span-2">
              <span>{copy.slugLabel}</span>
              <input
                name="slug"
                value={slugValue}
                onChange={(event) => handleSlugChange(event.target.value)}
                placeholder={copy.slugPlaceholder}
                className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 text-[color:var(--color-text)] outline-none"
              />
              <span className="text-xs leading-6 text-[color:var(--color-text-soft)]">{copy.slugHint}</span>
            </label>
            <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
              <span>{copy.statusLabel}</span>
              <select
                name="status"
                defaultValue={initialValues?.status ?? "DRAFT"}
                className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 text-[color:var(--color-text)] outline-none"
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
                className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 text-[color:var(--color-text)] outline-none"
              >
                <option value="IN_STOCK">{copy.inStock}</option>
                <option value="LOW_STOCK">{copy.lowStock}</option>
                <option value="OUT_OF_STOCK">{copy.outOfStock}</option>
                <option value="PREORDER">{copy.preorder}</option>
              </select>
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
                  className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 text-[color:var(--color-text)] outline-none"
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
                className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 text-[color:var(--color-text)] outline-none"
              />
            </label>
            <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
              <span>{copy.currencyLabel}</span>
              <input
                name="currency"
                maxLength={3}
                defaultValue={initialValues?.currency ?? STOREFRONT_CURRENCY_CODE}
                required
                className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 uppercase text-[color:var(--color-text)] outline-none"
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
                className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 text-[color:var(--color-text)] outline-none"
              />
            </label>
            {canViewFinancials ? (
              <div className="md:col-span-2 xl:col-span-5 rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-4">
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
                        {formatDisplayCurrency(unitFinancials.profitPerUnit)}
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
                        {formatDisplayCurrency(unitFinancials.purchasePrice ?? 0)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </details>
      </section>

      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-[color:var(--color-text)]">{copy.mediaTitle}</h2>
          <p className="max-w-3xl text-sm leading-7 text-[color:var(--color-text-soft)]">
            {copy.mediaHint} {copy.autoHeroFromGalleryHint}
          </p>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-[1.6rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] p-4">
              {heroPreviewUrl ? (
                <p className="mb-2 rounded-[0.75rem] bg-[color:var(--color-accent-line)]/15 px-3 py-1.5 text-xs font-medium text-[color:var(--color-text)]">
                  {copy.newHeroBadge}
                </p>
              ) : null}
              {currentHeroImage ? (
                <ProductImageFrame src={currentHeroImage} alt="Hero image preview" className="bg-white/90 shadow-none" />
              ) : (
                <div className="flex aspect-square min-h-[200px] items-center justify-center rounded-[1.2rem] border border-dashed border-[color:var(--color-line)] text-center text-sm text-[color:var(--color-text-soft)]">
                  Оберіть файл зображення або додайте знімки в галерею й натисніть «{copy.makeHero}».
                </div>
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
                {heroUploadError ? (
                  <p className="rounded-[1rem] border border-rose-500/20 bg-rose-500/8 px-3 py-2 text-xs text-rose-300">
                    {heroUploadError}
                  </p>
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
            {galleryUploadError ? (
              <p className="rounded-[1rem] border border-rose-500/20 bg-rose-500/8 px-3 py-2 text-xs text-rose-300">
                {galleryUploadError}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <details
        className="group rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)]"
        open={isEdit}
      >
        <summary className="cursor-pointer list-none text-2xl font-semibold text-[color:var(--color-text)] marker:content-none">
          {copy.detailsDescriptionSeo}
        </summary>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--color-text-soft)]">{copy.descriptionSectionHint}</p>

        <div className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{copy.descriptionLabel}</span>
            <textarea
              name={`description:${resolvedLocale}`}
              value={translationValues.description}
              onChange={(event) => updateTranslation("description", event.target.value)}
              className="min-h-32 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-3 text-[color:var(--color-text)] outline-none"
            />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
              <span>{copy.seoTitleLabel}</span>
              <input
                name={`seoTitle:${resolvedLocale}`}
                value={translationValues.seoTitle}
                onChange={(event) => updateTranslation("seoTitle", event.target.value)}
                className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
              />
            </label>
            <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
              <span>{copy.seoDescriptionLabel}</span>
              <input
                name={`seoDescription:${resolvedLocale}`}
                value={translationValues.seoDescription}
                onChange={(event) =>
                  updateTranslation("seoDescription", event.target.value)
                }
                className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
              />
            </label>
          </div>
        </div>
      </details>

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
            {specSuggestions.length > 0 && selectedCategoryLabel ? (
              <p className="max-w-3xl rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-3 text-sm text-[color:var(--color-text-soft)]">
                <span className="font-medium text-[color:var(--color-text)]">{copy.specsCategoryHintIntro} </span>
                «{selectedCategoryLabel}»: {specSuggestions.join(", ")}.
              </p>
            ) : null}
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

      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
        <h2 className="text-2xl font-semibold text-[color:var(--color-text)]">{copy.priceTrackingTitle}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-[color:var(--color-text-soft)]">{copy.priceTrackingHint}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm text-[color:var(--color-text-soft)]">
            <span>{copy.priceTrackingRozetkaLabel}</span>
            <input
              type="url"
              name="priceTrackingRozetkaUrl"
              value={ptRozetkaUrl}
              onChange={(e) => setPtRozetkaUrl(e.target.value)}
              placeholder={copy.priceTrackingPlaceholder}
              className="rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-2.5 text-sm text-[color:var(--color-text)] outline-none placeholder:text-[color:var(--color-text-soft)]/50"
            />
          </label>
          <label className="grid gap-1.5 text-sm text-[color:var(--color-text-soft)]">
            <span>{copy.priceTrackingTelemartLabel}</span>
            <input
              type="url"
              name="priceTrackingTelemartUrl"
              value={ptTelemartUrl}
              onChange={(e) => setPtTelemartUrl(e.target.value)}
              placeholder={copy.priceTrackingPlaceholder}
              className="rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-2.5 text-sm text-[color:var(--color-text)] outline-none placeholder:text-[color:var(--color-text-soft)]/50"
            />
          </label>
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

      <ProductFormBottomActions isUploading={isUploading} isEdit={isEdit} copy={copy} />

      {state.message ? (
        <p className="rounded-[1.2rem] border border-rose-500/20 bg-rose-500/8 px-4 py-3 text-sm text-rose-300">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
