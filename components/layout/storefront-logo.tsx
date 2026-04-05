"use client";

import Image from "next/image";
import { useState } from "react";

function normalizeLogoSource(value?: string | null) {
  const normalized = value?.trim();

  if (!normalized || normalized === "...") {
    return null;
  }

  if (normalized === "/brand/lumina-logo.png") {
    return "/brand/lumina-logo-tight.png";
  }

  return normalized;
}

export function StorefrontLogo({
  brandName,
  logoPath,
  logoText,
}: {
  brandName: string;
  logoPath?: string | null;
  logoText?: string | null;
}) {
  const [hasImageError, setHasImageError] = useState(false);
  const src = normalizeLogoSource(logoPath) ?? "/brand/lumina-logo-tight.png";
  const fallbackText = logoText?.trim() || brandName;

  return (
    <span className="inline-flex min-w-0 items-center justify-center self-center leading-none">
      {!hasImageError ? (
        <Image
          src={src}
          alt={brandName}
          width={520}
          height={210}
          priority
          sizes="(max-width: 640px) 224px, (max-width: 1024px) 272px, 320px"
          className="block h-11 w-auto max-w-[14rem] object-contain sm:h-12 sm:max-w-[16rem] lg:h-14 lg:max-w-[20rem]"
          onError={() => setHasImageError(true)}
        />
      ) : (
        <span className="block truncate font-heading text-xl font-semibold uppercase tracking-[0.18em] text-[color:var(--color-text)] sm:text-2xl">
          {fallbackText}
        </span>
      )}
    </span>
  );
}
