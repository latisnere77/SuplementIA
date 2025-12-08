FROM public.ecr.aws/lambda/python:3.11-arm64

# Install system dependencies
RUN yum install -y gcc gcc-c++ make

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
# Use --only-binary to force pre-built wheels (avoid GCC 9.3 requirement)
RUN pip install --no-cache-dir --only-binary=:all: -r requirements.txt

# Download the ML model during build
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# Copy Lambda function code
COPY lambda_function.py ${LAMBDA_TASK_ROOT}/

# Set the CMD to your handler
CMD [ "lambda_function.lambda_handler" ]
