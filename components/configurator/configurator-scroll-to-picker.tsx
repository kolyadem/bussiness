"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/** Плавно прокручує до вбудованого блоку підбору, коли в URL є ?pick=. */
export function ConfiguratorScrollToPicker() {
  const searchParams = useSearchParams();
  const pick = searchParams.get("pick");

  useEffect(() => {
    if (!pick) {
      return;
    }

    const id = window.requestAnimationFrame(() => {
      document.getElementById("configurator-picker")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });

    return () => window.cancelAnimationFrame(id);
  }, [pick]);

  return null;
}
