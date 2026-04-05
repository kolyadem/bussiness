import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { parseExistingGallery, type NormalizedProductPersistenceData } from "@/lib/admin/product-ingest";
import {
  buildTechnicalScalarFields,
  getAllTechnicalAttributeDefinitions,
  getTechnicalAttributeLabel,
} from "@/lib/configurator/technical-attributes";

async function syncProductTechnicalAttributes(
  tx: Prisma.TransactionClient,
  productId: string,
  technicalAttributes: Record<string, string>,
) {
  const definitions = getAllTechnicalAttributeDefinitions();
  const attributeRecords = await Promise.all(
    definitions.map((definition) =>
      tx.productAttribute.upsert({
        where: {
          code: definition.code,
        },
        update: {
          label: getTechnicalAttributeLabel(definition, "en"),
          unit: definition.unit ?? null,
        },
        create: {
          code: definition.code,
          label: getTechnicalAttributeLabel(definition, "en"),
          unit: definition.unit ?? null,
        },
        select: {
          id: true,
          code: true,
        },
      }),
    ),
  );

  await tx.productAttributeValue.deleteMany({
    where: {
      productId,
      attributeId: {
        in: attributeRecords.map((item) => item.id),
      },
    },
  });

  const values = attributeRecords.flatMap((attribute) => {
    const value = technicalAttributes[attribute.code];

    if (!value) {
      return [];
    }

    return [
      {
        attributeId: attribute.id,
        productId,
        value,
      },
    ];
  });

  if (values.length > 0) {
    await tx.productAttributeValue.createMany({
      data: values,
    });
  }
}

export async function createProductRecord(input: NormalizedProductPersistenceData) {
  return db.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        externalId: input.externalId,
        importSourceKey: input.importSourceKey,
        slug: input.slug,
        sku: input.sku,
        categoryId: input.categoryId,
        brandId: input.brandId,
        status: input.status,
        price: input.price,
        purchasePrice: input.purchasePrice,
        oldPrice: input.oldPrice,
        currency: input.currency,
        inventoryStatus: input.inventoryStatus,
        stock: input.stock,
        heroImage: input.heroImage,
        gallery: input.gallery,
        specs: input.specs,
        metadata: input.metadata,
        ...buildTechnicalScalarFields(input.technicalAttributes),
        translations: {
          create: input.translations,
        },
      },
    });

    await syncProductTechnicalAttributes(tx, product.id, input.technicalAttributes);

    return product;
  });
}

export async function updateProductRecord(productId: string, input: NormalizedProductPersistenceData) {
  const current = await db.product.findUnique({
    where: {
      id: productId,
    },
    select: {
      heroImage: true,
      gallery: true,
    },
  });

  await db.$transaction(async (tx) => {
    await tx.product.update({
      where: {
        id: productId,
      },
      data: {
        externalId: input.externalId,
        importSourceKey: input.importSourceKey,
        slug: input.slug,
        sku: input.sku,
        categoryId: input.categoryId,
        brandId: input.brandId,
        status: input.status,
        price: input.price,
        purchasePrice: input.purchasePrice,
        oldPrice: input.oldPrice,
        currency: input.currency,
        inventoryStatus: input.inventoryStatus,
        stock: input.stock,
        heroImage: input.heroImage,
        gallery: input.gallery,
        specs: input.specs,
        metadata: input.metadata,
        ...buildTechnicalScalarFields(input.technicalAttributes),
        translations: {
          deleteMany: {},
          create: input.translations,
        },
      },
    });

    await syncProductTechnicalAttributes(tx, productId, input.technicalAttributes);
  });

  return {
    previousHeroImage: current?.heroImage ?? null,
    previousGallery: current ? parseExistingGallery(current.gallery) : [],
    nextHeroImage: input.heroImage,
    nextGallery: parseExistingGallery(input.gallery),
  };
}

export function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function validateProductRelationTargets(input: {
  brandId: string;
  categoryId: string;
}) {
  const [brand, category] = await Promise.all([
    db.brand.findUnique({
      where: {
        id: input.brandId,
      },
      select: {
        id: true,
      },
    }),
    db.category.findUnique({
      where: {
        id: input.categoryId,
      },
      select: {
        id: true,
      },
    }),
  ]);

  return {
    brandExists: Boolean(brand),
    categoryExists: Boolean(category),
  };
}
