import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req) {
  const apiKey = req.headers.get("x-api-key");

  if (apiKey !== process.env.SHEETS_API_KEY) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await req.json();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { error } = await supabase.from("cases").insert({
    title: body.title,
    description: body.description,
    priority: body.priority || "normal",
    source: "google_sheets",
    external_ref: body.external_ref,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error(error);
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
