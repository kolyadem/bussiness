import { NextResponse } from "next/server";
import { reportServerError } from "@/lib/observability/logger";
import { addConfiguratorBuildToCart } from "@/lib/storefront/configurator-data";

export async function POST(
  _request: Request,
  context: RouteContext<"/api/configurator/builds/[slug]/cart">,
) {
  const { slug } = await context.params;
  try {
    const result = await addConfiguratorBuildToCart(slug);

    if (!result) {
      return NextResponse.json({ error: "Збірку не знайдено" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    await reportServerError(error, {
      area: "configurator.cart.route",
      message: "Could not add configurator build to cart",
      details: { slug },
    });

    return NextResponse.json(
      {
        error:
          error instanceof Error &&
          (error.message === "Збірку не знайдено" ||
            error.message === "Build not found" ||
            error.message.includes("compat"))
            ? error.message
            : "Не вдалося додати збірку в кошик",
      },
      { status: 409 },
    );
  }
}
