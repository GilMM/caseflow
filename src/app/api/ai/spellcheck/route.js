import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function norm(s) {
  return String(s || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function POST(req) {
  try {
    const body = await req.json();

    const title = String(body?.title ?? "");
    const description = String(body?.description ?? "");
    const locale = body?.locale || "he";

    // אם ריק לגמרי – אין מה לתקן
    if (!norm(title) && !norm(description)) {
      return NextResponse.json({
        correctedTitle: title,
        correctedDescription: description,
        changedTitle: false,
        changedDescription: false,
      });
    }

    const system = `
You are a strict spellchecker for Hebrew and English.
Fix spelling/typos and very light grammar ONLY.
Do NOT rewrite style. Do NOT change meaning.
Keep punctuation.
Return STRICT JSON only with this shape:
{
  "correctedTitle": "...",
  "correctedDescription": "...",
  "changedTitle": true/false,
  "changedDescription": true/false
}
`.trim();

    const user =
      locale === "he"
        ? `כותרת:\n${title}\n\nתיאור:\n${description}`
        : `Title:\n${title}\n\nDescription:\n${description}`;

    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    });

    const raw = resp.choices?.[0]?.message?.content || "{}";
    let out = {};
    try {
      out = JSON.parse(raw);
    } catch {
      // אם בכל זאת יצא משהו לא-JSON, נחזיר 500 כדי שתראה שיש בעיה
      return NextResponse.json(
        { error: "Model did not return valid JSON", raw },
        { status: 500 }
      );
    }

    const correctedTitle = String(out.correctedTitle ?? title);
    const correctedDescription = String(out.correctedDescription ?? description);

    // אל תסמוך על changedTitle/changedDescription של המודל — נחשב בעצמנו בוודאות
    const changedTitle = norm(correctedTitle) !== norm(title);
    const changedDescription = norm(correctedDescription) !== norm(description);

    return NextResponse.json({
      correctedTitle,
      correctedDescription,
      changedTitle,
      changedDescription,
      // עוזר לדיבאג
      debug: {
        inputTitle: norm(title),
        outputTitle: norm(correctedTitle),
        inputDesc: norm(description),
        outputDesc: norm(correctedDescription),
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Spellcheck failed" },
      { status: 500 }
    );
  }
}
