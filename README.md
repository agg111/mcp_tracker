# MCP Tracker

## MCP server
MCP tracker server - monitor.py

Supposed to pull metrics, logs, provide debugging suggestions

In user MCP, add function to record metric - 
```
def record_metric(server_name: str, metric_name: str, value: float, unit: str = "", tags: dict[str, Any] = {}) -> str:
    supabase.table("mcp_metrics").insert({
        "server_name": server_name,
        "metric_name": metric_name,
        "value": value,
        "unit": unit,
        "tags": tags
    }).execute()
```

Record metric from mcp.tool function as - 
```
# Send temperature as metric
    record_metric(
        server_name="weather-mcp",
        metric_name=f"forecast_temp_{name}",
        value=temp,
        unit=unit,
        tags={"wind": wind, "description": desc}
    }
```

## Streamlit dashboard for metrics

To run - 
```
streamlit run dashboard.py    
```

Open http://localhost:8501 to view metrics dashboard

