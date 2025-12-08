# Use an official AWS Lambda Python runtime as a parent image
# --- Build Stage ---
FROM python:3.11-slim-bookworm AS build-stage

# Install build dependencies (compilers, Python dev headers)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install them
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt -t /asset

# --- Final Stage ---
FROM public.ecr.aws/lambda/python:3.11

# Set the working directory in the container to where Lambda expects code
WORKDIR ${LAMBDA_TASK_ROOT}

# Copy the installed dependencies from the build stage
COPY --from=build-stage /asset ${LAMBDA_TASK_ROOT}

# Copy the application code
COPY main.py .

# Set the command to run when the container starts.
CMD [ "main.handler" ]
