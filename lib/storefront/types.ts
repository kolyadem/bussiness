import type {
  Brand,
  BrandTranslation,
  CartItem,
  Category,
  CategoryTranslation,
  CompareItem,
  Product,
  ProductAttribute,
  ProductAttributeValue,
  ProductTranslation,
  Review,
  SiteSettings,
  WishlistItem,
} from "@prisma/client";

export type ProductRecord = Product & {
  translations: ProductTranslation[];
  attributes: Array<
    ProductAttributeValue & {
      attribute: ProductAttribute;
    }
  >;
  brand: Brand & {
    translations: BrandTranslation[];
  };
  category: Category & {
    translations: CategoryTranslation[];
  };
  reviews: Review[];
};

export type CartItemRecord = CartItem & {
  product: ProductRecord;
};

export type WishlistItemRecord = WishlistItem & {
  product: ProductRecord;
};

export type CompareItemRecord = CompareItem & {
  product: ProductRecord;
};

export type SettingsRecord = SiteSettings;

export type CategoryTreeRecord = Category & {
  translations: CategoryTranslation[];
  children: Array<
    Category & {
      translations: CategoryTranslation[];
    }
  >;
};
