import streamlit as st
from supabase import create_client
from dotenv import load_dotenv
import os

# Load env variables
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

st.set_page_config(page_title="MCP Monitor", layout="wide")
st.title("📊 MCP Metrics Dashboard")

# Fetch metrics
with st.spinner("Fetching metrics..."):
    response = supabase.table("mcp_metrics").select(
        "*").order("created_at", desc=True).limit(100).execute()
    data = response.data if response else []

if not data:
    st.warning("No metrics found.")
else:
    st.dataframe(data)

    # Aggregate by server_name or metric_name
    servers = list(set(item["server_name"] for item in data))
    metric_names = list(set(item["metric_name"] for item in data))

    st.sidebar.header("Filters")
    selected_server = st.sidebar.selectbox("Server Name", ["All"] + servers)
    selected_metric = st.sidebar.selectbox(
        "Metric Name", ["All"] + metric_names)

    filtered = [
        m for m in data
        if (selected_server == "All" or m["server_name"] == selected_server) and
           (selected_metric == "All" or m["metric_name"] == selected_metric)
    ]

    st.subheader(f"Filtered Metrics ({len(filtered)} items)")
    st.dataframe(filtered)

    # Simple line chart
    if filtered:
        import pandas as pd
        df = pd.DataFrame(filtered)

        # Use created_at or another timestamp field if available
        if "created_at" in df.columns:
            df["timestamp"] = pd.to_datetime(df["created_at"])
        else:
            # fallback if you have another timestamp field, replace accordingly
            df["timestamp"] = pd.to_datetime(
                df.get("timestamp", pd.Timestamp.now()))

        df = df.sort_values("timestamp")

        # Pivot table: index = timestamp, columns = metric_name, values = value
        chart = df.pivot(index="timestamp",
                         columns="metric_name", values="value")
        st.line_chart(chart)
