FROM python:3.12-slim

WORKDIR /app

RUN pip install prometheus-client pyyaml

COPY main.py .

CMD ["python", "main.py"]
