"use client";

import { useState } from "react";
import { ProductImageFrame } from "@/components/ui/product-image-frame";
import { cn } from "@/lib/utils";

export function ProductMediaGallery({
  images,
  name,
  brandName,
}: {
  images: string[];
  name: string;
  brandName: string;
}) {
  const sanitizedImages = images.filter(Boolean);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeImage = sanitizedImages[activeIndex] ?? sanitizedImages[0];

  if (!activeImage) {
    return null;
  }

  return (
    <div className="space-y-4">
      <ProductImageFrame
        src={activeImage}
        alt={name}
        watermark={brandName}
        className="rounded-[2.2rem] border-[color:var(--color-line)] bg-[color:var(--color-surface-strong)] shadow-[var(--shadow-strong)]"
        fillClassName="group-hover:scale-[1.08] sm:p-10"
        priority
      />

      {sanitizedImages.length > 1 ? (
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-5 lg:grid-cols-4">
          {sanitizedImages.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={cn(
                "rounded-[1.35rem] border bg-[color:var(--color-surface-elevated)] p-2 transition duration-300 hover:-translate-y-0.5 hover:border-[color:var(--color-accent-line)]",
                index === activeIndex
                  ? "border-[color:var(--color-accent-line)] bg-[color:var(--color-accent-soft)] shadow-[0_14px_32px_rgba(24,184,255,0.14)]"
                  : "border-[color:var(--color-line-strong)]",
              )}
              aria-label={`${name} image ${index + 1}`}
            >
              <ProductImageFrame
                src={image}
                alt={`${name} ${index + 1}`}
                watermark={brandName}
                className="rounded-[1rem] border-none bg-[color:var(--color-surface-strong)] shadow-none"
                fillClassName="p-4"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
