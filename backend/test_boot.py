print("BOOT TEST: Python is alive!", flush=True)

from fastapi import FastAPI

app = FastAPI()

@app.get("/")
async def root():
    return {"status": "online", "message": "Minimal test - FastAPI is running!"}
