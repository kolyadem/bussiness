import type { Metadata } from "next";
import { getAuthenticatedUser } from "@/lib/auth";
import type { AppLocale } from "@/lib/constants";
import { Link } from "@/lib/i18n/routing";
import { getOrderNumber } from "@/lib/storefront/orders";
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
  params,
  searchParams,
}: {
  params: Promise<{ locale: AppLocale }>;
  searchParams: Promise<{ order?: string }>;
}) {
  const [, { order }, viewer] = await Promise.all([
    params,
    searchParams,
    getAuthenticatedUser(),
  ]);

  const steps = [
    "1. Ми перевіримо склад і підтвердимо деталі замовлення.",
    "2. Після підтвердження передамо замовлення в обробку та відправку.",
    "3. Якщо ви були авторизовані, замовлення вже видно в акаунті.",
  ];

  return (
    <main className="storefront-shell mx-auto flex min-h-[calc(100vh-16rem)] w-full max-w-[980px] items-center px-4 py-10 sm:px-6 lg:px-8 xl:px-10">
      <section className="w-full rounded-[2.5rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-8 shadow-[var(--shadow-soft)] sm:p-10">
        <div className="max-w-2xl">
          <p className="text-sm uppercase tracking-[0.24em] text-[color:var(--color-accent-strong)]">
            Замовлення прийнято
          </p>
          <h1 className="mt-4 font-heading text-4xl font-semibold tracking-[-0.05em] text-[color:var(--color-text)] sm:text-5xl">
            Дякуємо, замовлення вже в роботі
          </h1>
          <p className="mt-4 text-sm leading-7 text-[color:var(--color-text-soft)] sm:text-base">
            Ми вже зберегли ваше замовлення. Менеджер {"зв'яжеться"} з вами телефоном або email, щоб підтвердити склад і доставку.
          </p>
          {order ? (
            <div className="mt-6 inline-flex rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-2 text-sm font-medium text-[color:var(--color-text)]">
              Номер замовлення: {getOrderNumber(order)}
            </div>
          ) : null}
          <div className="mt-6 grid gap-3">
            {steps.map((step) => (
              <div
                key={step}
                className="rounded-[1.2rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-3 text-sm leading-6 text-[color:var(--color-text-soft)]"
              >
                {step}
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={viewer ? "/account" : "/catalog"}
              className="inline-flex h-12 items-center justify-center rounded-full bg-[color:var(--color-text)] px-6 text-sm font-medium text-[color:var(--color-surface)]"
            >
              {viewer ? "До акаунта" : "До каталогу"}
            </Link>
            <Link
              href="/"
              className="inline-flex h-12 items-center justify-center rounded-full border border-[color:var(--color-line)] px-6 text-sm font-medium text-[color:var(--color-text)]"
            >
              На головну
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
