# Admin Product Ingest API

## Authentication

The ingest API is session-protected.

- Sign in with an admin or manager account using the existing admin auth flow.
- The API reuses the current NextAuth session and role checks.
- Requests without a valid session return `401`.
- Requests from users below `MANAGER` return `403`.

## Endpoints

### Create product

- `POST /api/admin/products`

### Update product

- `PUT /api/admin/products/:id`

`id` is the internal product id from Prisma.

## Supported payload

```json
{
  "locale": "uk",
  "slug": "asus-rtx-5070-proart",
  "sku": "GPU-ASUS-5070-PROART",
  "categoryId": "cm123...",
  "brandId": "cm456...",
  "status": "PUBLISHED",
  "price": 89900,
  "oldPrice": 94900,
  "currency": "USD",
  "inventoryStatus": "IN_STOCK",
  "stock": 12,
  "heroImage": "/uploads/products/example-hero.png",
  "gallery": [
    "/uploads/products/example-hero.png",
    "/uploads/products/example-gallery-2.png"
  ],
  "specs": {
    "chip": "RTX 5070",
    "memory": "16 GB",
    "cooling": "Triple fan"
  },
  "metadata": {
    "featured": true
  },
  "translations": [
    {
      "locale": "uk",
      "name": "ASUS ProArt RTX 5070",
      "shortDescription": "Короткий опис",
      "description": "Повний опис",
      "seoTitle": "SEO title",
      "seoDescription": "SEO description"
    },
    {
      "locale": "ru",
      "name": "ASUS ProArt RTX 5070",
      "shortDescription": "Краткое описание",
      "description": "Полное описание",
      "seoTitle": "SEO title",
      "seoDescription": "SEO description"
    },
    {
      "locale": "en",
      "name": "ASUS ProArt RTX 5070",
      "shortDescription": "Short description",
      "description": "Full description",
      "seoTitle": "SEO title",
      "seoDescription": "SEO description"
    }
  ]
}
```

## Required fields

- `locale`
- `slug`
- `sku`
- `categoryId`
- `brandId`
- `status`
- `price`
- `currency`
- `inventoryStatus`
- `stock`
- `heroImage`
- `translations` for `uk`, `ru`, and `en`

## Notes

- `gallery` is optional. If it is omitted or empty, the API uses `heroImage` as the gallery fallback.
- `specs` supports any number of keys.
- `metadata` is optional and stored as JSON.
- Image upload is still handled by the existing admin upload flow; the ingest API currently accepts already-known server paths.

## Responses

### Success

Create returns `201`:

```json
{
  "ok": true,
  "mode": "create",
  "productId": "cm...",
  "slug": "asus-rtx-5070-proart",
  "sku": "GPU-ASUS-5070-PROART"
}
```

Update returns `200`:

```json
{
  "ok": true,
  "mode": "update",
  "productId": "cm...",
  "slug": "asus-rtx-5070-proart",
  "sku": "GPU-ASUS-5070-PROART"
}
```

### Validation error

`400 Bad Request`

```json
{
  "error": "Invalid product payload",
  "issues": [
    {
      "path": "translations.0.name",
      "message": "String must contain at least 2 character(s)"
    }
  ]
}
```

### Relation error

`404 Not Found`

- brand not found
- category not found
- product not found on update

### Conflict error

`409 Conflict`

- duplicate `slug`
- duplicate `sku`
