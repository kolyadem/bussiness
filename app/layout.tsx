import type { Metadata } from "next";
import { headers } from "next/headers";
import { Inter, Manrope } from "next/font/google";
import { defaultLocale } from "@/lib/constants";
import { resolveLocaleFromPathname } from "@/lib/storefront/seo";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "Lumina Tech",
  description: "Foundation stage of a premium multilingual electronics store built with Next.js and Prisma.",
};

const themeInitScript = `
  (() => {
    try {
      const storedTheme = localStorage.getItem("lumina-theme");
      const theme = storedTheme === "light" || storedTheme === "dark"
        ? storedTheme
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
    } catch {
      document.documentElement.dataset.theme = "light";
      document.documentElement.style.colorScheme = "light";
    }
  })();
`;

async function getDocumentLocale() {
  const requestHeaders = await headers();
  const headerCandidates = [
    requestHeaders.get("x-pathname"),
    requestHeaders.get("next-url"),
    requestHeaders.get("referer"),
  ];

  for (const candidate of headerCandidates) {
    const locale = resolveLocaleFromPathname(candidate);

    if (locale) {
      return locale;
    }
  }

  return defaultLocale;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const documentLocale = await getDocumentLocale();

  return (
    <html
      lang={documentLocale}
      suppressHydrationWarning
      className={`${inter.variable} ${manrope.variable} h-full antialiased`}
    >
      <head>
        {/* Inline early theme init: avoids next/script + dangerouslySetInnerHTML quirks in React 19 / devtools noise */}
        <script id="theme-init" dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
