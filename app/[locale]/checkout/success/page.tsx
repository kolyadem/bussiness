import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { AppLocale } from "@/lib/constants";
import { pageMetadata } from "@/lib/storefront/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return pageMetadata(
    locale,
    "cartSeoTitle",
    "Сторінка підтвердження замовлення.",
    "/checkout/success",
    {
      title: "Замовлення підтверджено",
      indexable: false,
    },
  );
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;

  redirect(order ? `/thanks?type=order&id=${encodeURIComponent(order)}` : "/thanks");
}
