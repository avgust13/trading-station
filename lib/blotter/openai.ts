import "server-only";

import OpenAI from "openai";

import type { ParseResponse } from "./types";

// LLM extraction of raw order-execution rows from a broker screenshot or
// pasted text. The model only transcribes — all math (grouping, averages,
// P&L) happens in deterministic TypeScript on the client.

const DEFAULT_MODEL = "gpt-4o-mini";

const SYSTEM_PROMPT = `You extract order executions from broker order-history screenshots or pasted text.

Rules:
1. Output one row per order line in the source, including canceled/rejected/working orders — copy their status into "status" so the UI can show what was skipped. Executed rows have status "Filled" (or similar).
2. When the source has both an "Amount" (ordered) column and a "Filled" (executed) column, use the Filled quantity for "qty".
3. "side" is strictly "buy" or "sell". Map Buy/Sell, B/S, Long/Short entry labels, Купля/Покупка/Продажа accordingly.
4. "time" is copied exactly as displayed (e.g. "09:58:30"). Do not convert timezones.
5. "date" must be "YYYY-MM-DD" and only set when a date is actually visible in the source. Otherwise null — never guess.
6. "price" and "qty" are plain decimal numbers without currency signs or thousands separators.
7. "symbol" is the ticker, uppercase.
8. If a cell is unreadable or a row is ambiguous, omit that row and mention it in "notes". Otherwise "notes" is null.`;

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    fills: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          symbol: { type: "string" },
          side: { type: "string", enum: ["buy", "sell"] },
          qty: { type: "number" },
          price: { type: "number" },
          time: { type: "string" },
          date: { type: ["string", "null"] },
          status: { type: ["string", "null"] },
        },
        required: ["symbol", "side", "qty", "price", "time", "date", "status"],
      },
    },
    notes: { type: ["string", "null"] },
  },
  required: ["fills", "notes"],
} as const;

export interface ParseInput {
  text?: string;
  imageBase64?: string;
  imageMimeType?: string;
}

export async function parseFills(input: ParseInput): Promise<ParseResponse> {
  const client = new OpenAI();

  const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];
  if (input.imageBase64) {
    content.push({
      type: "image_url",
      image_url: {
        url: `data:${input.imageMimeType ?? "image/png"};base64,${input.imageBase64}`,
      },
    });
    content.push({ type: "text", text: "Extract the order executions from this screenshot." });
  } else {
    content.push({
      type: "text",
      text: `Extract the order executions from this text:\n\n${input.text ?? ""}`,
    });
  }

  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "broker_fills", strict: true, schema: RESPONSE_SCHEMA },
    },
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("OpenAI вернул пустой ответ.");

  const parsed = JSON.parse(raw) as ParseResponse;
  if (!Array.isArray(parsed.fills)) throw new Error("OpenAI вернул некорректную структуру.");

  // Normalize defensively even though the schema is strict.
  return {
    fills: parsed.fills
      .filter((f) => f && typeof f.symbol === "string" && Number.isFinite(f.qty) && f.qty > 0)
      .map((f) => ({
        symbol: f.symbol.toUpperCase().trim(),
        side: f.side === "sell" ? "sell" : "buy",
        qty: f.qty,
        price: f.price,
        time: f.time.trim(),
        date: f.date,
        status: f.status,
      })),
    notes: parsed.notes ?? null,
  };
}
