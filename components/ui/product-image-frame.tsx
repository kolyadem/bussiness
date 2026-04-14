import Image from "next/image";
import { PngProductSurface } from "@/components/ui/png-product-surface";
import { resolveHeroImageSrc } from "@/lib/storefront/product-image";
import { cn } from "@/lib/utils";

export function ProductImageFrame({
  src,
  alt,
  className,
  priority,
  fillClassName,
  watermark,
  sizes,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  fillClassName?: string;
  watermark?: string;
  /** Narrow layouts (e.g. configurator slot column) — improves image selection & LCP. */
  sizes?: string;
}) {
  const resolved = resolveHeroImageSrc(src);
  const isTransparentPng = resolved.toLowerCase().endsWith(".png");
  const isSvg = resolved.toLowerCase().endsWith(".svg");

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-[1.9rem] border border-[color:var(--color-line)] bg-[var(--gradient-hero)] shadow-[inset_0_1px_0_var(--color-overlay-strong)]",
        className,
      )}
    >
      <div className="absolute inset-x-6 top-5 h-24 rounded-full bg-[color:var(--color-accent-soft)] blur-3xl" />
      <div className="absolute inset-x-10 bottom-4 h-12 rounded-full bg-[color:var(--color-accent-line)] blur-3xl opacity-70" />
      <div className="relative aspect-[4/3]">
        {isTransparentPng ? (
          <PngProductSurface watermark={watermark ?? "Lumina"} />
        ) : null}
        <div className="absolute inset-x-4 bottom-4 h-10 rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-overlay-soft)] opacity-85 blur-2xl" />
        <Image
          src={resolved}
          alt={alt}
          fill
          priority={priority}
          unoptimized={isSvg}
          className={cn(
            "z-[1] object-contain p-7 transition duration-500 group-hover:scale-[1.06] sm:p-8",
            fillClassName,
          )}
          sizes={sizes ?? "(max-width: 768px) 100vw, 33vw"}
        />
      </div>
    </div>
  );
}
