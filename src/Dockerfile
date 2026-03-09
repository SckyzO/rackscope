# Backend Dockerfile
FROM python:3.12.13-slim-bookworm

WORKDIR /app

# Create a non-root user matching host UID/GID for writable bind mounts
ARG UID=1000
ARG GID=1000
RUN groupadd -g ${GID} appuser \
    && useradd -m -u ${UID} -g ${GID} appuser

# Install system dependencies (if any needed later, e.g. curl)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy project definition and all package sources first so that
# the editable install can register both rackscope and plugins packages.
COPY pyproject.toml .
COPY src/ src/
COPY plugins/ plugins/

# Install dependencies (editable, with dev tools).
# plugins/ must exist before this step so setuptools discovers the package.
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -e '.[dev]'

# Copy config last (changes most often — keeps pip install layer cached)
COPY config/ config/

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app/src:/app

# Ensure app files are owned by the non-root user
RUN chown -R appuser:appuser /app

# Run as non-root
USER appuser

# Default command (overridden by docker-compose for dev)
CMD ["uvicorn", "rackscope.api.app:app", "--host", "0.0.0.0", "--port", "8000"]
