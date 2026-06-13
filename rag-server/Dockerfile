FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY phrasal_verbs_api.py .

EXPOSE 8100

CMD ["uvicorn", "phrasal_verbs_api:app", "--host", "0.0.0.0", "--port", "8100"]
