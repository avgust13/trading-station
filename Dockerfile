FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY weekly_market_report.py server.py index.html ./

EXPOSE 8888

CMD ["python", "-u", "server.py"]
