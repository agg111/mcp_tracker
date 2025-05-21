from mcp.server.fastmcp import FastMCP
from datetime import datetime
from typing import Dict, List, Optional
import uuid
import os
from dotenv import load_dotenv
from supabase import create_client
import uvicorn

load_dotenv()

mcp = FastMCP("MCP Tracker")
supabase = create_client(os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_KEY"))

metrics_store = []  # In-memory store

@mcp.tool()
def record_metric(source: str, name: str, value: float, timestamp: Optional[str] = None):
    """Record a metric from an MCP"""
    metric = {
        "id": str(uuid.uuid4()),
        "source": source,
        "name": name,
        "value": value,
        "timestamp": timestamp or datetime.utcnow().isoformat()
    }

    metrics_store.append(metric)

    # Persist to Supabase
    try:
        supabase.table("metrics").insert(metric).execute()
    except Exception as e:
        print(f"Failed to write metric to Supabase: {e}")
    return f"Metric '{name}' recorded from '{source}'."

@mcp.tool()
def get_metrics(source: Optional[str] = None, name: Optional[str] = None) -> List[Dict]:
    """Retrieve recorded metrics, optionally filtered"""
    results = metrics_store
    if source:
        results = [m for m in results if m["source"] == source]
    if name:
        results = [m for m in results if m["name"] == name]
    return results

@mcp.tool()
def mco_healthcheck() -> str:
    return "MCP Monitor server is up"

if __name__ == "__main__":
    uvicorn.run(mcp.http_app, host="0.0.0.0", port=8000)

