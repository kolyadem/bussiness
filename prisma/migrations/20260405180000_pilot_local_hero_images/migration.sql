-- Pilot SKUs: replace external heroImage/gallery with local paths (next/image unconfigured host fix).
UPDATE "Product"
SET
  "heroImage" = '/products/cpu.svg',
  "gallery" = '["/products/cpu.svg"]',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "sku" IN ('PILOT1-CPU-INT-I5-13600K', 'PILOT1-CPU-INT-I7-14700K');

UPDATE "Product"
SET
  "heroImage" = '/products/case.svg',
  "gallery" = '["/products/case.svg"]',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "sku" = 'PILOT1-CASE-LAN-O11D-EVO';

-- Legacy catalog CPUs in the same slot: external intel.com URLs break next/image alongside pilot rows.
UPDATE "Product"
SET
  "heroImage" = '/products/cpu.svg',
  "gallery" = '["/products/cpu.svg"]',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "sku" IN ('CPU-INT-9400F', 'CPU-INT-9700K', 'CPU-INT-9900K');
