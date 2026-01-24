import { NextResponse } from "next/server";

export async function GET(req) {
  const url = new URL(req.url);
  const target = new URL("/api/integrations/google/auth/callback", url.origin);
  url.searchParams.forEach((v, k) => target.searchParams.set(k, v));
  return NextResponse.redirect(target.toString());
}
