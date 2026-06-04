import { NextResponse } from "next/server";

import { fetchAll } from "@/lib/market";
import type { ApiData, ApiError } from "@/lib/types";

// yahoo-finance2 needs the Node runtime (cookies/crumb), and the data must be
// fetched fresh on every request.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { rows, as_of } = await fetchAll();
    if (rows.length === 0) {
      return NextResponse.json({ error: "Live Yahoo Finance data unavailable." } satisfies ApiError, {
        status: 502,
      });
    }
    return NextResponse.json({ as_of, rows, source: "live" } satisfies ApiData);
  } catch (err) {
    console.error("[error] /api/data failed:", err);
    return NextResponse.json({ error: "Live Yahoo Finance data unavailable." } satisfies ApiError, {
      status: 502,
    });
  }
}
