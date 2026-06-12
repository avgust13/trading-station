import { NextResponse } from "next/server";

import { storeClearAll, storeGetState } from "@/lib/blotter/store";
import type { BlotterApiError, BlotterState } from "@/lib/blotter/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(storeGetState() satisfies BlotterState);
  } catch (err) {
    console.error("[error] GET /api/blotter/state failed:", err);
    return NextResponse.json(
      { error: "Не удалось прочитать журнал сделок." } satisfies BlotterApiError,
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    storeClearAll();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[error] DELETE /api/blotter/state failed:", err);
    return NextResponse.json(
      { error: "Не удалось очистить журнал." } satisfies BlotterApiError,
      { status: 500 },
    );
  }
}
