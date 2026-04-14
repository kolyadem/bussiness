"use client";

import { useEffect, useState } from "react";
import { PRODUCT_IMAGE_FALLBACK, resolveHeroImageSrc } from "@/lib/storefront/product-image";

/**
 * Configurator slot column only: plain <img> in a fixed aspect box.
 * Avoids next/image `fill` + ProductImageFrame stacking/layout edge cases in narrow grid cells.
 */
export function ConfiguratorSlotProductPreview({
  heroImage,
  name,
}: {
  heroImage: string;
  name: string;
}) {
  const primarySrc = resolveHeroImageSrc(heroImage);
  const [src, setSrc] = useState(primarySrc);

  useEffect(() => {
    setSrc(primarySrc);
  }, [primarySrc]);

  return (
    <div className="relative isolate aspect-[4/3] w-full min-h-[3.5rem] overflow-hidden rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)]">
      {/* Intentional: next/image fill was not reliably visible in slot grid; native img is deterministic here. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={name}
        className="absolute inset-0 box-border h-full w-full object-contain p-2"
        loading="eager"
        onError={() => {
          if (src !== PRODUCT_IMAGE_FALLBACK) {
            setSrc(PRODUCT_IMAGE_FALLBACK);
          }
        }}
      />
    </div>
  );
}
