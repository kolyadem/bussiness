"use client";

import Image from "next/image";
import { useState } from "react";
import { useTheme } from "@/components/providers/theme-provider";

/** Dark-only asset (PNG RGBA from design). */
const DARK_LOGO_SRC = "/brand/lumina-logo-dark.png";
const DARK_LOGO_DIM = { width: 805, height: 310 } as const;
const LIGHT_LOGO_DIM = { width: 1040, height: 420 } as const;

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
  const { theme, mounted } = useTheme();
  const [imageFailed, setImageFailed] = useState(false);

  const lightSrc = normalizeLogoSource(logoPath) ?? "/brand/lumina-logo-tight.png";

  /** One asset at a time: light until client knows theme, then follow ThemeProvider (synced with html + localStorage). */
  const isDarkLogo = mounted && theme === "dark";
  const src = isDarkLogo ? DARK_LOGO_SRC : lightSrc;
  const intrinsic = isDarkLogo ? DARK_LOGO_DIM : LIGHT_LOGO_DIM;
  const fallbackText = logoText?.trim() || brandName;

  return (
    <span className="inline-flex min-w-0 items-center justify-center self-center bg-transparent leading-none">
      {!imageFailed ? (
        <Image
          key={src}
          src={src}
          alt={brandName}
          width={intrinsic.width}
          height={intrinsic.height}
          priority
          sizes="(max-width: 640px) 224px, (max-width: 1024px) 272px, 320px"
          unoptimized
          className="block h-11 w-auto max-w-[14rem] bg-transparent object-contain sm:h-12 sm:max-w-[16rem] lg:h-14 lg:max-w-[20rem]"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className="block truncate font-heading text-xl font-semibold uppercase tracking-[0.18em] text-[color:var(--color-text)] sm:text-2xl">
          {fallbackText}
        </span>
      )}
    </span>
  );
}
