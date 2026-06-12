import { NextResponse } from "next/server";

import { storeSetNote } from "@/lib/blotter/store";
import type { BlotterApiError } from "@/lib/blotter/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(req: Request) {
  let body: { tradeId?: unknown; note?: unknown };
  try {
    body = (await req.json()) as { tradeId?: unknown; note?: unknown };
  } catch {
    return NextResponse.json({ error: "Некорректный JSON." } satisfies BlotterApiError, {
      status: 400,
    });
  }
  if (typeof body.tradeId !== "string" || body.tradeId.length === 0 || typeof body.note !== "string") {
    return NextResponse.json(
      { error: "Ожидаются поля tradeId (строка) и note (строка)." } satisfies BlotterApiError,
      { status: 400 },
    );
  }
  try {
    storeSetNote(body.tradeId, body.note);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[error] PUT /api/blotter/notes failed:", err);
    return NextResponse.json(
      { error: "Не удалось сохранить заметку." } satisfies BlotterApiError,
      { status: 500 },
    );
  }
}
