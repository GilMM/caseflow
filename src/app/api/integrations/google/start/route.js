import { NextResponse } from "next/server";

export async function GET(req) {
  const url = new URL(req.url);
  url.pathname = "/api/integrations/google/auth/start";
  return NextResponse.redirect(url.toString());
}
