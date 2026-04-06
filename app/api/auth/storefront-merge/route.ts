import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { getSessionId } from "@/lib/session";
import { mergeStorefrontStateIntoUser } from "@/lib/storefront/persistence";

export async function POST() {
  const [viewer, sessionId] = await Promise.all([getAuthenticatedUser(), getSessionId()]);

  if (!viewer?.id) {
    return NextResponse.json({ error: "Потрібна автентифікація" }, { status: 401 });
  }

  await mergeStorefrontStateIntoUser({
    userId: viewer.id,
    sessionId,
  });

  return NextResponse.json({ ok: true });
}
