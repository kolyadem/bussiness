import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Hide `X-Powered-By: Next.js` on deployed responses (minor hygiene). */
  poweredByHeader: false,
  /** Stable production builds; avoid leaking dev-only stack traces in client bundles. */
  productionBrowserSourceMaps: false,
  /** Product images on Vercel Blob are absolute HTTPS URLs on *.public.blob.vercel-storage.com */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
        pathname: "/**",
      },
    ],
  },
  experimental: {
    // Keep request bodies for proxy and server actions above product image limit.
    proxyClientMaxBodySize: "12mb",
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
};

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

export default withNextIntl(nextConfig);
