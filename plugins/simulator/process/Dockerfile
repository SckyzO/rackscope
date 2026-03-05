FROM python:3.12.13-slim-bookworm

WORKDIR /app

RUN pip install --no-cache-dir prometheus-client pyyaml

# Build the plugins package namespace
RUN mkdir -p plugins/simulator/process && \
    touch plugins/__init__.py \
          plugins/simulator/__init__.py \
          plugins/simulator/process/__init__.py

# Copy simulator process modules into the package
COPY config.py     plugins/simulator/process/config.py
COPY topology.py   plugins/simulator/process/topology.py
COPY metrics.py    plugins/simulator/process/metrics.py
COPY labels.py     plugins/simulator/process/labels.py
COPY overrides.py  plugins/simulator/process/overrides.py
COPY loop.py       plugins/simulator/process/loop.py
COPY main.py       plugins/simulator/process/main.py

ENV PYTHONPATH=/app

CMD ["python", "-m", "plugins.simulator.process.main"]
