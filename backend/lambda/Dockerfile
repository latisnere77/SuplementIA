# Dockerfile for ankosoft-formulation-api Lambda
# Integrated with Intelligent Evidence System

# Use AWS Lambda Python base image
FROM public.ecr.aws/lambda/python:3.11

# Set working directory
WORKDIR ${LAMBDA_TASK_ROOT}

# Copy requirements first for better caching
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy function code
COPY lambda_function.py .
COPY query_validator.py .

# Set the CMD to your handler
CMD ["lambda_function.lambda_handler"]
