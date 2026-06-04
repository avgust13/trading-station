# Daily Intel

A small Python + Flask project that builds and serves a weekly market dashboard using Yahoo Finance data.

The project includes:
- A live web page with a Refresh button and color-coded market moves
- A reusable report generator that can output browser and email-friendly HTML
- A lightweight API for market rows and ticker metadata
- A Docker image for easy local/container runs

## Features

- Tracks a curated set of market symbols (equities, sectors, bonds, crude, crypto)
- Computes:
  - Previous close (Yest)
  - Latest close (Today)
  - Daily change and percent change
  - Weekly percent change (approx. last 5 trading days)
  - MTD and YTD percent change
- Adds ticker descriptions for hover tooltips and a glossary block
- Falls back to sample data when live data is unavailable

## Project Structure

- `server.py` - Flask app that serves the UI and JSON endpoints
- `weekly_market_report.py` - Data fetch + report rendering logic
- `index.html` - Browser UI that fetches `/api/data`
- `report.html` - Standalone generated report preview
- `requirements.txt` - Python dependencies
- `Dockerfile` - Container build/run definition

## Requirements

- Python 3.10+ (tested with 3.12 in Docker)
- Internet access for live Yahoo Finance pulls

## Local Setup (.venv)

1. Create a local virtual environment named `.venv`:

```bash
python -m venv .venv
```

2. Activate it:

Windows (PowerShell):

```powershell
.\.venv\Scripts\Activate.ps1
```

Windows (cmd):

```bat
.venv\Scripts\activate.bat
```

macOS/Linux:

```bash
source .venv/bin/activate
```

3. Install dependencies:

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

## Run the Web App

```bash
python server.py
```

If your environment is not active yet, activate `.venv` first using the commands above.

Open:
- http://localhost:8888

On the page, click **Refresh data** to load the latest values.

## API Endpoints

- `GET /api/data`
  - Returns:
    - `as_of`: display date for latest close
    - `rows`: computed metrics per symbol
  - Returns HTTP 502 if no live rows are available

- `GET /api/tickers`
  - Returns symbol metadata (`symbol`, `name`, `desc`)

## Generate Report Files Directly

Run the report script:

```bash
python weekly_market_report.py
```

Outputs:
- `report.html` - full standalone page
- `report_email.html` - email-body-friendly HTML snippet

Use sample/offline mode:

```bash
python weekly_market_report.py --sample
```

## Run with Docker

Using Docker Compose (recommended — starts automatically with Docker):

```bash
docker compose up -d
```

To stop:

```bash
docker compose down
```

Or build and run manually (one-off, no auto-restart):

```bash
docker build -t weekly-market-report .
docker run --rm -p 8888:8888 weekly-market-report
```

Then open http://localhost:8888.

## Dependencies

Pinned in `requirements.txt`:
- Flask
- yfinance
- pandas

## Notes

- Data source is Yahoo Finance via yfinance.
- Market availability and symbol support depend on Yahoo Finance responses.
- If live fetch fails, running `weekly_market_report.py` will fall back to sample data.