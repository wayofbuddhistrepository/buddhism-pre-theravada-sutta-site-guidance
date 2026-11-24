FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py .
RUN useradd --create-home appuser
USER appuser
ENV HF_HOME=/home/appuser/.cache/huggingface CPU_THREADS=2
EXPOSE 7860
CMD ["uvicorn","app:app","--host","0.0.0.0","--port","7860","--workers","1"]
