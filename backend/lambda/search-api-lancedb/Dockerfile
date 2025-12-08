FROM public.ecr.aws/lambda/python:3.11

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies using pre-built wheels only
# This avoids needing gcc and makes build much faster
RUN pip install --no-cache-dir --only-binary=:all: -r requirements.txt

# Copy Lambda function code
COPY lambda_function.py ${LAMBDA_TASK_ROOT}/

# Set the CMD to your handler
CMD [ "lambda_function.lambda_handler" ]
