"""Weekly Monday-morning market report.

Replicates Brian Shannon's AlphaTrends layout (Yest / Today / Chg / Chg% / Wk% / MTD% / YTD%)
with a dark theme and hover tooltips on each ticker symbol.

Outputs:
    report.html  — standalone HTML preview (open in browser)
    report_email.html — inline-styled HTML for Gmail (no <html>/<head> wrapper)

Usage:
    python weekly_market_report.py
"""
from __future__ import annotations

import sys
import logging
import time
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd
import requests
import yfinance as yf

OUT_DIR = Path(__file__).parent

# yfinance can emit noisy fetch errors for transient Yahoo issues; we handle failures ourselves.
logging.getLogger("yfinance").setLevel(logging.CRITICAL)

# Display symbol -> Yahoo Finance symbol + human-readable name + tooltip description
TICKERS = [
    ("SPY",  "SPY",     "SPDR S&P 500 ETF",                   "Tracks the S&P 500 — the 500 largest US companies. Broad large-cap benchmark."),
    ("QQQ",  "QQQ",     "Invesco QQQ Trust",                  "Tracks the Nasdaq-100 — 100 largest non-financial Nasdaq names. Tech-heavy growth proxy."),
    ("IWM",  "IWM",     "iShares Russell 2000 ETF",           "Tracks the Russell 2000 — small-cap US stocks. Classic risk-on / risk-off tell."),
    ("SMH",  "SMH",     "VanEck Semiconductor ETF",           "25 largest semiconductor companies. Key AI / cyclical-growth barometer."),
    ("XBI",  "XBI",     "SPDR S&P Biotech ETF",               "Equal-weighted biotech basket. High-beta speculative health gauge."),
    ("DIA",  "DIA",     "SPDR Dow Jones Industrial Avg ETF",  "Tracks the Dow 30 — 30 US blue-chip industrials/financials."),
    ("XLF",  "XLF",     "Financial Select Sector SPDR",       "S&P 500 financials — banks, insurers, asset managers, exchanges."),
    ("TLT",  "TLT",     "iShares 20+ Year Treasury Bond ETF", "Long-dated US Treasuries. Moves inverse to long-end yields."),
    ("XLE",  "XLE",     "Energy Select Sector SPDR",          "S&P 500 energy — oil & gas majors, refiners, services."),
    ("XLK",  "XLK",     "Technology Select Sector SPDR",      "S&P 500 tech — software, hardware, semis."),
    ("CL1!", "CL=F",    "WTI Crude Oil — front-month future", "West Texas Intermediate crude futures, front month. Global energy macro tell."),
    ("BTC",  "BTC-USD", "Bitcoin (USD spot)",                 "Bitcoin price in US dollars."),
    ("ETH",  "ETH-USD", "Ethereum (USD spot)",                "Ethereum price in US dollars."),
]


def _scalar(x) -> float:
    """yfinance sometimes returns 1-row Series; coerce to float."""
    if hasattr(x, "iloc"):
        x = x.iloc[0]
    return float(x)


def _close_series(df: pd.DataFrame | None):
    if df is None or df.empty or "Close" not in df:
        return None
    close = df["Close"]
    if hasattr(close, "columns"):
        close = close.iloc[:, 0]
    if len(close) < 2:
        return None
    return close


def _chart_payload(yf_symbol: str, *, range_: str, interval: str) -> dict | None:
    """Fetch Yahoo chart JSON directly; this avoids yfinance query1 rate-limit failures."""
    url = f"https://query2.finance.yahoo.com/v8/finance/chart/{yf_symbol}"
    params = {"range": range_, "interval": interval}
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                      "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
    }

    for attempt in range(3):
        try:
            resp = requests.get(url, params=params, headers=headers, timeout=15)
            # Retry on transient/rate-limit responses.
            if resp.status_code in (429, 500, 502, 503, 504):
                if attempt < 2:
                    time.sleep(0.8 * (attempt + 1))
                    continue
                return None
            resp.raise_for_status()
            payload = resp.json()
            result = payload.get("chart", {}).get("result")
            if not result:
                return None
            return result[0]
        except Exception:
            if attempt < 2:
                time.sleep(0.8 * (attempt + 1))
                continue
            return None

    return None


def _close_series_from_chart_payload(chart: dict | None):
    if not chart:
        return None
    timestamps = chart.get("timestamp") or []
    indicators = chart.get("indicators", {})
    quote = (indicators.get("quote") or [{}])[0]
    closes = quote.get("close") or []
    if not timestamps or not closes:
        return None

    n = min(len(timestamps), len(closes))
    idx = pd.to_datetime(timestamps[:n], unit="s")
    series = pd.Series(closes[:n], index=idx, dtype="float64").dropna()
    if len(series) < 2:
        return None
    return series


def _download_close(yf_symbol: str):
    # First choice: direct Yahoo chart endpoint (query2 host).
    chart = _chart_payload(yf_symbol, range_="18mo", interval="1d")
    close = _close_series_from_chart_payload(chart)
    if close is not None:
        return close

    today = datetime.now().date()
    start = datetime(today.year - 1, 12, 1).date()

    # Primary path: full-range download.
    try:
        df = yf.download(
            yf_symbol,
            start=start.isoformat(),
            end=(today + timedelta(days=1)).isoformat(),
            progress=False,
            auto_adjust=False,
            threads=False,
        )
        close = _close_series(df)
        if close is not None:
            return close
    except Exception:
        pass

    # Fallback path: ticker history endpoint is sometimes more resilient.
    try:
        hist = yf.Ticker(yf_symbol).history(period="18mo", interval="1d", auto_adjust=False)
        close = _close_series(hist)
        if close is not None:
            return close
    except Exception:
        pass

    return None


def _live_price(yf_symbol: str) -> float | None:
    """Try to fetch a fresher 'last traded' style price than 1D close."""
    # Prefer direct chart metadata; avoids yfinance query1 rate-limit edge cases.
    chart = _chart_payload(yf_symbol, range_="5d", interval="15m")
    if chart:
        try:
            meta = chart.get("meta", {})
            regular_price = meta.get("regularMarketPrice")
            if regular_price is not None:
                return _scalar(regular_price)
        except Exception:
            pass
        close = _close_series_from_chart_payload(chart)
        if close is not None and len(close) > 0:
            try:
                return _scalar(close.iloc[-1])
            except Exception:
                pass

    try:
        ticker = yf.Ticker(yf_symbol)
    except Exception:
        return None

    # fast_info is the cheapest path when available.
    try:
        fi = ticker.fast_info
        if fi:
            last_price = fi.get("lastPrice")
            if last_price is not None:
                return _scalar(last_price)
            regular_price = fi.get("regularMarketPrice")
            if regular_price is not None:
                return _scalar(regular_price)
    except Exception:
        pass

    # Fallback: recent intraday bars.
    try:
        intraday = ticker.history(period="2d", interval="15m", auto_adjust=False)
        close = _close_series(intraday)
        if close is not None and len(close) > 0:
            return _scalar(close.iloc[-1])
    except Exception:
        pass

    return None


def fetch_one(yf_symbol: str) -> dict | None:
    today = datetime.now().date()
    close = _download_close(yf_symbol)
    if close is None:
        return None

    close_last = _scalar(close.iloc[-1])
    live_last = _live_price(yf_symbol)
    last = live_last if live_last is not None else close_last
    prev  = _scalar(close.iloc[-2])
    # 5 trading days back = approx one week
    wk_idx = -6 if len(close) >= 6 else 0
    week_back = _scalar(close.iloc[wk_idx])

    # Month-to-date baseline = last close of prior month
    cur_month_first = pd.Timestamp(today.year, today.month, 1)
    prev_month_close = close[close.index < cur_month_first]
    mtd_base = _scalar(prev_month_close.iloc[-1]) if len(prev_month_close) else last

    # Year-to-date baseline = last close of prior year
    cur_year_first = pd.Timestamp(today.year, 1, 1)
    prev_year_close = close[close.index < cur_year_first]
    ytd_base = _scalar(prev_year_close.iloc[-1]) if len(prev_year_close) else last

    return {
        "yest":   prev,
        "today":  last,
        "chg":    last - prev,
        "chg_pct": (last - prev) / prev * 100 if prev else 0.0,
        "wk_pct":  (last - week_back) / week_back * 100 if week_back else 0.0,
        "mtd_pct": (last - mtd_base) / mtd_base * 100 if mtd_base else 0.0,
        "ytd_pct": (last - ytd_base) / ytd_base * 100 if ytd_base else 0.0,
        "as_of":  close.index[-1].strftime("%b %d, %Y"),
        "price_basis": "live" if live_last is not None else "close",
    }


def fetch_all() -> tuple[list[dict], str]:
    rows = []
    as_of = ""
    for sym, yf_sym, name, desc in TICKERS:
        try:
            data = fetch_one(yf_sym)
        except Exception as e:
            print(f"[warn] {sym} fetch failed: {e}", file=sys.stderr)
            data = None
        if data is None:
            continue
        as_of = data["as_of"]
        rows.append({"symbol": sym, "name": name, "desc": desc, **data})
    return rows, as_of


# ---------- HTML rendering ----------

GREEN = "#22c55e"
RED   = "#ef4444"
GREY  = "#9ca3af"
BG    = "#0b0f17"
PANEL = "#111827"
BORDER = "#1f2937"
HEADER_FG = "#e5e7eb"
TICKER_FG = "#60a5fa"
PRICE_FG = "#93c5fd"


def fmt_price(v: float) -> str:
    if v >= 10000:
        return f"{v:,.0f}"
    if v >= 1000:
        return f"{v:,.2f}"
    return f"{v:,.2f}"


def fmt_pct(v: float) -> str:
    return f"{v:+.2f}%"


def fmt_chg(v: float) -> str:
    if abs(v) >= 1000:
        return f"{v:+,.0f}"
    return f"{v:+,.2f}"


def color_for(v: float) -> str:
    if v > 0.001:
        return GREEN
    if v < -0.001:
        return RED
    return GREY


SANS = "-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif"
MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,Liberation Mono,monospace"


def render_table(rows: list[dict]) -> str:
    th_style = (
        f"padding:10px 14px;text-align:right;font-weight:600;"
        f"color:{HEADER_FG};border-bottom:1px solid {BORDER};"
        f"font-size:13px;letter-spacing:0.04em;text-transform:uppercase;"
        f"font-family:{SANS};"
    )
    th_left = th_style + "text-align:left;"

    header = (
        f'<tr style="background:{PANEL};">'
        f'<th style="{th_left}">Ticker</th>'
        f'<th style="{th_style}">Yest</th>'
        f'<th style="{th_style}">Today</th>'
        f'<th style="{th_style}">Chg</th>'
        f'<th style="{th_style}">Chg %</th>'
        f'<th style="{th_style}">Wk %</th>'
        f'<th style="{th_style}">MTD %</th>'
        f'<th style="{th_style}">YTD %</th>'
        f'</tr>'
    )

    body = []
    for i, r in enumerate(rows):
        zebra = "#0d1320" if i % 2 == 0 else "#0b0f17"
        td_base = (
            f"padding:11px 14px;text-align:right;"
            f"font-family:{MONO};"
            f"font-size:14px;border-bottom:1px solid {BORDER};"
        )
        td_ticker = (
            f"padding:11px 14px;text-align:left;"
            f"font-family:{SANS};"
            f"font-size:15px;font-weight:700;color:{TICKER_FG};"
            f"border-bottom:1px solid {BORDER};"
        )
        # Tooltip: title attribute works on hover in Gmail and most clients
        tooltip = f"{r['name']} — {r['desc']}".replace('"', "&quot;")
        ticker_cell = (
            f'<td style="{td_ticker}background:{zebra};">'
            f'<span title="{tooltip}" style="border-bottom:1px dotted {GREY};cursor:help;">'
            f'{r["symbol"]}</span></td>'
        )

        body.append(
            f'<tr>'
            f'{ticker_cell}'
            f'<td style="{td_base}background:{zebra};color:{HEADER_FG};">{fmt_price(r["yest"])}</td>'
            f'<td style="{td_base}background:{zebra};color:{PRICE_FG};font-weight:600;">{fmt_price(r["today"])}</td>'
            f'<td style="{td_base}background:{zebra};color:{color_for(r["chg"])};">{fmt_chg(r["chg"])}</td>'
            f'<td style="{td_base}background:{zebra};color:{color_for(r["chg_pct"])};">{fmt_pct(r["chg_pct"])}</td>'
            f'<td style="{td_base}background:{zebra};color:{color_for(r["wk_pct"])};font-weight:600;">{fmt_pct(r["wk_pct"])}</td>'
            f'<td style="{td_base}background:{zebra};color:{color_for(r["mtd_pct"])};">{fmt_pct(r["mtd_pct"])}</td>'
            f'<td style="{td_base}background:{zebra};color:{color_for(r["ytd_pct"])};">{fmt_pct(r["ytd_pct"])}</td>'
            f'</tr>'
        )

    table = (
        f'<table cellpadding="0" cellspacing="0" border="0" '
        f'style="border-collapse:collapse;width:100%;background:{BG};">'
        f'<thead>{header}</thead><tbody>{"".join(body)}</tbody></table>'
    )
    return table


def render_email_body(rows: list[dict], as_of: str) -> str:
    """Inline-styled HTML suitable for Gmail body (no <html> wrapper needed but harmless)."""
    title_date = as_of.upper() if as_of else datetime.now().strftime("%b %d, %Y").upper()
    table_html = render_table(rows)

    # Tooltip legend — listed because some clients strip title attributes
    legend_items = "".join(
        f"<li style='margin:4px 0;color:{HEADER_FG};font-size:13px;'>"
        f"<strong style='color:{TICKER_FG};'>{r['symbol']}</strong> "
        f"<span style='color:{GREY};'>— {r['name']}.</span> {r['desc']}</li>"
        for r in rows
    )

    return f"""
<div style="background:{BG};padding:24px 16px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:760px;margin:0 auto;background:{BG};border:1px solid {BORDER};border-radius:12px;overflow:hidden;">
    <div style="padding:20px 22px 14px 22px;border-bottom:1px solid {BORDER};">
      <div style="color:{GREY};font-size:12px;letter-spacing:0.18em;text-transform:uppercase;">Daily Intel</div>
      <div style="color:{HEADER_FG};font-size:24px;font-weight:700;margin-top:4px;">Monday Morning Markets</div>
      <div style="color:{TICKER_FG};font-size:14px;margin-top:6px;font-weight:600;">As of {title_date}</div>
    </div>
    {table_html}
    <div style="padding:16px 22px;border-top:1px solid {BORDER};color:{GREY};font-size:12px;line-height:1.5;">
      Hover any ticker for a full description. Wk% uses the last 5 trading days. MTD/YTD baselines are the last close of the prior month/year. Source: Yahoo Finance.
    </div>
  </div>
  <div style="max-width:760px;margin:18px auto 0 auto;background:{PANEL};border:1px solid {BORDER};border-radius:12px;padding:16px 22px;">
    <div style="color:{HEADER_FG};font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:8px;">Ticker Glossary</div>
    <ul style="margin:0;padding-left:18px;list-style:disc;">
      {legend_items}
    </ul>
  </div>
</div>
""".strip()


def render_full_html(rows: list[dict], as_of: str) -> str:
    """Standalone HTML for browser preview."""
    body = render_email_body(rows, as_of)
    return f"""<!doctype html>
<html><head><meta charset="utf-8"><title>Daily Intel — {as_of}</title>
<style>body{{margin:0;background:{BG};}}</style>
</head><body>{body}</body></html>"""


# ---------- Direct-render path (used by the scheduled task) ----------

def render_from_rows(rows: list[dict], as_of: str | None = None) -> tuple[str, str]:
    """Given a list of pre-built row dicts (each with symbol/yest/today/chg/chg_pct/wk_pct/mtd_pct/ytd_pct),
    return (full_html, email_html). Symbol metadata (name, desc) is filled in from TICKERS automatically.

    This is what the scheduled-task Claude session calls after gathering prices via WebSearch."""
    meta = {sym: (name, desc) for sym, _yf, name, desc in TICKERS}
    enriched = []
    for r in rows:
        sym = r["symbol"]
        name, desc = meta.get(sym, (sym, ""))
        enriched.append({**r, "name": name, "desc": desc})
    if as_of is None:
        as_of = datetime.now().strftime("%b %d, %Y")
    return render_full_html(enriched, as_of), render_email_body(enriched, as_of)


def main() -> int:
    """Live path — tries yfinance, falls back to sample data if blocked."""
    if "--sample" in sys.argv:
        rows, as_of = _sample_rows()
        print("Rendering with SAMPLE data (no network).")
    else:
        print("Fetching market data…")
        rows, as_of = fetch_all()
        if not rows:
            print("Network blocked or no data — falling back to sample.", file=sys.stderr)
            rows, as_of = _sample_rows()

    full_html = render_full_html(rows, as_of)
    email_html = render_email_body(rows, as_of)

    (OUT_DIR / "report.html").write_text(full_html, encoding="utf-8")
    (OUT_DIR / "report_email.html").write_text(email_html, encoding="utf-8")
    print(f"Wrote: {OUT_DIR / 'report.html'}")
    print(f"Wrote: {OUT_DIR / 'report_email.html'}")
    return 0


def _sample_rows() -> tuple[list[dict], str]:
    """Mocked rows that mirror Brian Shannon's screenshot — used only to preview the design."""
    raw = [
        ("SPY", 705.23, 710.14, 4.91, 0.70, 2.41, -1.20, 4.18),
        ("QQQ", 612.45, 619.02, 6.57, 1.07, 2.88, -0.95, 6.11),
        ("IWM", 248.10, 251.29, 3.19, 1.29, 3.42, -3.87, 2.08),
        ("SMH", 388.10, 396.50, 8.40, 2.16, 4.83, -3.46, 8.94),
        ("XBI", 127.40, 128.96, 1.56, 1.22, 2.84, 1.25, 5.77),
        ("DIA", 466.10, 465.09, -1.01, -0.22, 1.04, -2.02, -1.22),
        ("XLF", 49.31, 49.54, 0.23, 0.47, 1.64, -1.67, -3.55),
        ("TLT", 86.40, 86.79, 0.39, 0.45, 1.33, -2.44, -0.42),
        ("XLE", 60.12, 59.25, -0.87, -1.45, -3.31, 3.95, 12.52),
        ("XLK", 134.21, 136.01, 1.80, 1.34, 3.71, -1.98, 5.53),
        ("CL1!", 78.20, 79.47, 1.27, 1.62, 2.76, 4.32, 6.36),
        ("BTC", 67891.0, 66891.0, -1000.0, -1.47, 1.35, 4.42, -8.60),
        ("ETH", 2210.0, 2187.0, -23.0, -1.04, 2.65, 6.95, -12.54),
    ]
    rows = []
    meta = {sym: (name, desc) for sym, _yf, name, desc in TICKERS}
    for sym, yest, today, chg, chg_pct, wk, mtd, ytd in raw:
        name, desc = meta[sym]
        rows.append(dict(
            symbol=sym, name=name, desc=desc,
            yest=yest, today=today, chg=chg,
            chg_pct=chg_pct, wk_pct=wk, mtd_pct=mtd, ytd_pct=ytd,
        ))
    return rows, datetime.now().strftime("%b %d, %Y")


if __name__ == "__main__":
    raise SystemExit(main())
