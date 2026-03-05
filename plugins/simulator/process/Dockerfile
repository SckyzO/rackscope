FROM python:3.12-slim

WORKDIR /app

RUN pip install prometheus-client pyyaml

# Copy all process modules
COPY config.py topology.py metrics.py labels.py overrides.py loop.py main.py ./

# plugins package init files needed for intra-package imports
RUN mkdir -p /app/plugins/simulator/process && \
    touch /app/plugins/__init__.py /app/plugins/simulator/__init__.py /app/plugins/simulator/process/__init__.py && \
    cp *.py /app/plugins/simulator/process/

ENV PYTHONPATH=/app

CMD ["python", "-m", "plugins.simulator.process.main"]
