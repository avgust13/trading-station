import { NextResponse } from "next/server";

import { parseFills } from "@/lib/blotter/openai";
import type { BlotterApiError, ParseResponse } from "@/lib/blotter/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ParseRequestBody {
  text?: string;
  imageBase64?: string;
  imageMimeType?: string;
}

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Не задан OPENAI_API_KEY в .env.local." } satisfies BlotterApiError,
      { status: 500 },
    );
  }

  let body: ParseRequestBody;
  try {
    body = (await req.json()) as ParseRequestBody;
  } catch {
    return NextResponse.json({ error: "Некорректный JSON." } satisfies BlotterApiError, {
      status: 400,
    });
  }

  const hasText = typeof body.text === "string" && body.text.trim().length > 0;
  const hasImage = typeof body.imageBase64 === "string" && body.imageBase64.length > 0;
  if (hasText === hasImage) {
    return NextResponse.json(
      { error: "Нужен либо текст, либо скриншот (ровно одно из двух)." } satisfies BlotterApiError,
      { status: 400 },
    );
  }

  try {
    const result = await parseFills({
      text: hasText ? body.text : undefined,
      imageBase64: hasImage ? body.imageBase64 : undefined,
      imageMimeType: body.imageMimeType,
    });
    return NextResponse.json(result satisfies ParseResponse);
  } catch (err) {
    console.error("[error] /api/blotter/parse failed:", err);
    const message =
      err instanceof Error && err.message ? err.message : "Не удалось распознать сделки.";
    return NextResponse.json({ error: message } satisfies BlotterApiError, { status: 502 });
  }
}
