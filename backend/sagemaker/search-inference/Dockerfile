# SageMaker Serverless Inference Container
# Optimized for ML inference with SentenceTransformer + LanceDB

FROM python:3.11-slim

# Set working directory
WORKDIR /opt/ml/code

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy code
COPY inference.py .
COPY serve .

# Make serve executable
RUN chmod +x serve

# Pre-download the model to bake it into the image
# This significantly reduces cold start time
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV SAGEMAKER_PROGRAM=serve
ENV SM_MODEL_DIR=/opt/ml/model

# Create model directory
RUN mkdir -p /opt/ml/model

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/ping || exit 1

# Start serve script
ENTRYPOINT ["python", "/opt/ml/code/serve"]
