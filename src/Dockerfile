# Backend Dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies (if any needed later, e.g. curl)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy project definition
COPY pyproject.toml .

# Install dependencies
# We install '.[dev]' to include testing tools inside the container
RUN pip install --no-cache-dir -e '.[dev]'

# Copy source code
COPY src/ src/
COPY config-examples/ config-examples/

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app/src

# Default command (overridden by docker-compose for dev)
CMD ["uvicorn", "rackscope.api.app:app", "--host", "0.0.0.0", "--port", "8000"]
