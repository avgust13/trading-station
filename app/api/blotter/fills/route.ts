import { NextResponse } from "next/server";

import { storeAddFills, storeDeleteFills } from "@/lib/blotter/store";
import type { BlotterApiError, Fill } from "@/lib/blotter/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isFill(v: unknown): v is Fill {
  if (!v || typeof v !== "object") return false;
  const f = v as Partial<Fill>;
  return (
    typeof f.id === "string" &&
    f.id.length > 0 &&
    typeof f.symbol === "string" &&
    f.symbol.length > 0 &&
    (f.side === "buy" || f.side === "sell") &&
    typeof f.qty === "number" &&
    Number.isFinite(f.qty) &&
    f.qty > 0 &&
    typeof f.price === "number" &&
    Number.isFinite(f.price) &&
    typeof f.executedAt === "string" &&
    Number.isFinite(Date.parse(f.executedAt)) &&
    typeof f.importedAt === "string"
  );
}

export async function POST(req: Request) {
  let body: { fills?: unknown };
  try {
    body = (await req.json()) as { fills?: unknown };
  } catch {
    return NextResponse.json({ error: "Некорректный JSON." } satisfies BlotterApiError, {
      status: 400,
    });
  }
  if (!Array.isArray(body.fills) || body.fills.length === 0 || !body.fills.every(isFill)) {
    return NextResponse.json(
      { error: "Ожидается непустой массив fills корректной формы." } satisfies BlotterApiError,
      { status: 400 },
    );
  }
  try {
    const added = storeAddFills(body.fills);
    return NextResponse.json({ added });
  } catch (err) {
    console.error("[error] POST /api/blotter/fills failed:", err);
    return NextResponse.json(
      { error: "Не удалось сохранить исполнения." } satisfies BlotterApiError,
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  let body: { ids?: unknown };
  try {
    body = (await req.json()) as { ids?: unknown };
  } catch {
    return NextResponse.json({ error: "Некорректный JSON." } satisfies BlotterApiError, {
      status: 400,
    });
  }
  if (
    !Array.isArray(body.ids) ||
    body.ids.length === 0 ||
    !body.ids.every((id) => typeof id === "string")
  ) {
    return NextResponse.json(
      { error: "Ожидается непустой массив ids." } satisfies BlotterApiError,
      { status: 400 },
    );
  }
  try {
    storeDeleteFills(body.ids);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[error] DELETE /api/blotter/fills failed:", err);
    return NextResponse.json(
      { error: "Не удалось удалить исполнения." } satisfies BlotterApiError,
      { status: 500 },
    );
  }
}
