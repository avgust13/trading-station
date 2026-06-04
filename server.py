"""Flask server that serves index.html and exposes yfinance data at /api/data.

Run:
    pip install flask
    python server.py
Then open http://localhost:5000
"""
from __future__ import annotations

from flask import Flask, jsonify, send_from_directory
from pathlib import Path

from weekly_market_report import fetch_all, TICKERS

ROOT = Path(__file__).parent
app = Flask(__name__, static_folder=None)


@app.route("/")
def index():
    return send_from_directory(ROOT, "index.html")


@app.route("/api/data")
def api_data():
    rows, as_of = fetch_all()
    if not rows:
        return jsonify({"error": "Live Yahoo Finance data unavailable."}), 502
    return jsonify({"as_of": as_of, "rows": rows, "source": "live"})


@app.route("/api/tickers")
def api_tickers():
    return jsonify([
        {"symbol": sym, "name": name, "desc": desc}
        for sym, _yf, name, desc in TICKERS
    ])


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8888)
