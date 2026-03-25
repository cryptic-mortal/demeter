import sys
import os
from dotenv import load_dotenv

# --- PATH FIX ---
current_dir = os.path.dirname(os.path.abspath(__file__))
# Adjust this depending on where main.py sits relative to root folder
project_root = os.path.abspath(os.path.join(current_dir, "../../"))
sys.path.append(project_root)
agent_root = os.path.abspath(os.path.join(project_root, "agent"))
sys.path.append(agent_root)

# Load env from root
env_path = os.path.join(project_root, ".env")
if os.path.exists(env_path):
    load_dotenv(env_path)
# ----------------

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from Sentinel.agent import FMUBuilder

# Import the logic functions
from backend.server.functions import (
    process_ingest,
    process_search,
    process_text_query,
    process_audio_search,
    process_cycle_stream,
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("🌱 Server Starting...")
builder = FMUBuilder()
print("✅ Server Ready.")


@app.post("/ingest")
async def ingest_endpoint(
    file: UploadFile = File(...), sensors: str = Form(...), metadata: str = Form(...)
):
    return await process_ingest(file, sensors, metadata, builder)


@app.post("/search")
async def search_endpoint(file: UploadFile = File(...), sensors: str = Form(...)):
    # This endpoint now triggers the Full Agent Reasoning Loop
    return await process_search(file, sensors, builder)


@app.post("/run-cycle-stream")
async def run_cycle_stream_endpoint(
    file: UploadFile = File(...), sensors: str = Form(...)
):
    return StreamingResponse(
        process_cycle_stream(file, sensors, builder),
        media_type="text/event-stream",
    )


@app.post("/query-text")
async def text_query_endpoint(query: str = Form(...)):
    return await process_text_query(query)


@app.post("/query-audio")
async def audio_query_endpoint(file: UploadFile = File(...)):
    return await process_audio_search(file)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
