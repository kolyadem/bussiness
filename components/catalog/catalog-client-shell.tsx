"use client";

import { createContext, useContext, useTransition, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type CatalogNavigationContext = {
  isPending: boolean;
  navigate: (updater: (current: URLSearchParams) => void) => void;
};

const Ctx = createContext<CatalogNavigationContext>({
  isPending: false,
  navigate: () => {},
});

export function useCatalogNavigation() {
  return useContext(Ctx);
}

export function CatalogClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const navigate = useCallback(
    (updater: (current: URLSearchParams) => void) => {
      const current = new URLSearchParams(params.toString());
      updater(current);
      current.delete("page");
      const query = current.toString();
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname);
      });
    },
    [pathname, params, router],
  );

  return <Ctx value={{ isPending, navigate }}>{children}</Ctx>;
}
