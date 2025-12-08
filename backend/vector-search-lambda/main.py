import os
import json
import boto3
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import lancedb

# --- Configuration ---
EFS_PATH = "/mnt/db"
TABLE_NAME = "supplements"

# --- AWS Bedrock Client ---
bedrock_runtime = boto3.client("bedrock-runtime")
TITAN_EMBED_MODEL_ID = "amazon.titan-embed-text-v1"

# --- Helper to get embeddings from Bedrock ---
async def get_embedding(text: str) -> list[float]:
    try:
        body = json.dumps({"inputText": text})
        response = await bedrock_runtime.invoke_model(
            modelId=TITAN_EMBED_MODEL_ID,
            contentType="application/json",
            accept="application/json",
            body=body,
        )
        response_body = json.loads(response["body"].read())
        return response_body["embedding"]
    except Exception as e:
        print(f"Error getting embedding from Bedrock: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate embedding: {e}")

# --- Pydantic Models for API validation ---
class SearchQuery(BaseModel):
    query: str
    limit: int = 10

class IndexData(BaseModel):
    id: str
    text: str

# --- FastAPI Application ---
app = FastAPI()

# --- Database Connection ---
# This will be initialized when the Lambda container starts
db = None
table = None

@app.on_event("startup")
async def startup_event():
    global db, table
    try:
        print(f"Connecting to LanceDB at: {EFS_PATH}")
        db = lancedb.connect(EFS_PATH)
        
        # Check if table exists, otherwise create it
        if TABLE_NAME not in db.table_names():
            print(f"Table '{TABLE_NAME}' not found. Creating a new one.")
            # Generate a real embedding for initial data
            initial_embedding = await get_embedding("initial document")
            initial_data = [{"vector": initial_embedding, "text": "init", "id": "0"}]
            db.create_table(TABLE_NAME, data=initial_data, mode="overwrite")
            print("Table created successfully.")
        
        table = db.open_table(TABLE_NAME)
        print("Successfully connected to table.")

    except Exception as e:
        print(f"FATAL: Could not connect to LanceDB. Error: {e}")
        raise HTTPException(status_code=500, detail=f"Database initialization failed: {e}")

@app.post("/search")
async def search(query: SearchQuery):
    """
    Performs a vector search on the LanceDB table.
    """
    if not table:
        raise HTTPException(status_code=500, detail="Database not initialized.")
    
    try:
        # Generate embedding for the query
        query_embedding = await get_embedding(query.query)
        
        results = table.search(query_embedding).limit(query.limit).to_df()
        
        return {"results": results.to_dict(orient="records")}
    except Exception as e:
        print(f"Search failed: {e}")
        raise HTTPException(status_code=500, detail=f"Search operation failed: {e}")

@app.post("/index")
async def index(data: IndexData):
    """
    Adds or updates a document in the LanceDB table.
    """
    if not table:
        raise HTTPException(status_code=500, detail="Database not initialized.")
    
    try:
        # Generate embedding for the text to be indexed
        text_embedding = await get_embedding(data.text)
        
        table.add([{"id": data.id, "text": data.text, "vector": text_embedding}])
        return {"status": "success", "id": data.id}
    except Exception as e:
        print(f"Indexing failed: {e}")
        raise HTTPException(status_code=500, detail=f"Index operation failed: {e}")

# --- Lambda Handler ---
from mangum import Mangum
handler = Mangum(app)
