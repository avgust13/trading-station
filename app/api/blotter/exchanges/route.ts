import { NextResponse } from "next/server";

import {
  storeAddExchange,
  storeDeleteExchange,
  storeUpdateExchange,
} from "@/lib/blotter/store";
import type { BlotterApiError, Exchange } from "@/lib/blotter/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function badRequest(error: string) {
  return NextResponse.json({ error } satisfies BlotterApiError, { status: 400 });
}

export async function POST(req: Request) {
  let body: { name?: unknown; capital?: unknown };
  try {
    body = (await req.json()) as { name?: unknown; capital?: unknown };
  } catch {
    return badRequest("Некорректный JSON.");
  }
  if (typeof body.name !== "string" || body.name.trim().length === 0) {
    return badRequest("Название биржи не может быть пустым.");
  }
  const capital = typeof body.capital === "number" ? body.capital : 0;
  if (!Number.isFinite(capital) || capital < 0) {
    return badRequest("Капитал должен быть числом ≥ 0.");
  }
  try {
    const exchange = storeAddExchange(body.name, capital);
    return NextResponse.json(exchange satisfies Exchange);
  } catch (err) {
    console.error("[error] POST /api/blotter/exchanges failed:", err);
    return NextResponse.json(
      { error: "Не удалось создать биржу." } satisfies BlotterApiError,
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  let body: { id?: unknown; name?: unknown; capital?: unknown };
  try {
    body = (await req.json()) as { id?: unknown; name?: unknown; capital?: unknown };
  } catch {
    return badRequest("Некорректный JSON.");
  }
  if (typeof body.id !== "string" || body.id.length === 0) {
    return badRequest("Не указан id биржи.");
  }
  if (body.name !== undefined && (typeof body.name !== "string" || body.name.trim().length === 0)) {
    return badRequest("Название биржи не может быть пустым.");
  }
  if (
    body.capital !== undefined &&
    (typeof body.capital !== "number" || !Number.isFinite(body.capital) || body.capital < 0)
  ) {
    return badRequest("Капитал должен быть числом ≥ 0.");
  }
  try {
    const updated = storeUpdateExchange(body.id, {
      name: body.name as string | undefined,
      capital: body.capital as number | undefined,
    });
    if (!updated) return NextResponse.json({ error: "Биржа не найдена." }, { status: 404 });
    return NextResponse.json(updated satisfies Exchange);
  } catch (err) {
    console.error("[error] PUT /api/blotter/exchanges failed:", err);
    return NextResponse.json(
      { error: "Не удалось обновить биржу." } satisfies BlotterApiError,
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  let body: { id?: unknown };
  try {
    body = (await req.json()) as { id?: unknown };
  } catch {
    return badRequest("Некорректный JSON.");
  }
  if (typeof body.id !== "string" || body.id.length === 0) {
    return badRequest("Не указан id биржи.");
  }
  try {
    storeDeleteExchange(body.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[error] DELETE /api/blotter/exchanges failed:", err);
    return NextResponse.json(
      { error: "Не удалось удалить биржу." } satisfies BlotterApiError,
      { status: 500 },
    );
  }
}
