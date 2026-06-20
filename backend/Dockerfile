# Universal container for the Pickly backend. Works on Fly.io, Railway, Render,
# Google Cloud Run, or any host that runs Docker.
FROM python:3.12-slim

WORKDIR /app

# Install dependencies first (better build caching).
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code.
COPY . .

# Hosts inject the port to listen on via $PORT (default 8000 locally).
ENV PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
