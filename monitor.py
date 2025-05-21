from mcp.server.fastmcp import FastMCP
from datetime import datetime
from typing import Dict, List, Optional, Union
import uuid
import os
import sys
from dotenv import load_dotenv
from supabase import create_client
import io
import base64
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from matplotlib.gridspec import GridSpec

load_dotenv()

mcp = FastMCP("MCP Tracker")
supabase = create_client(os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_KEY"))

@mcp.tool()
def mcp_healthcheck() -> str:
    return "MCP Monitor server is up"

@mcp.tool()
def get_metrics(server_name: Optional[str] = None, metric_name: Optional[str] = None) -> List[Dict]:
    """Retrieve recorded metrics, optionally filtered"""
    try:
        query = supabase.table("mcp_metrics").select("*")
        if server_name:
            query = query.eq("server_name", server_name)
        if metric_name:
            query = query.eq("metric_name", metric_name)
        response = query.execute()
        data = response.data or []
    except Exception as e:
        print(f"Failed to fetch metrics from Supabase: {e}")
        return []
    return data

@mcp.tool()
def get_metrics_for_chart(server_name: Optional[str] = None, metric_name: Optional[str] = None) -> Dict[str, List[Dict]]:
    """
    Fetches metrics from Supabase and returns data formatted for chart visualization.

    Args:
        server_name: Filter by MCP server name (e.g. 'weather', 'MCP Tracker').
        metric_name: Filter by metric name (e.g. 'temperature', 'wind').

    Returns:
        Dictionary mapping metric names to lists of time-series data points
        like { "cpu_usage": [{"x": created_at, "y": value}, ...] }.
    """
    try:
        # query = supabase.table("mcp_metrics").select("*")
        # if server_name:
        #     query = query.eq("server_name", server_name)
        # if metric_name:
        #     query = query.eq("metric_name", metric_name)
        
        # response = query.execute()

        response = supabase.table("mcp_metrics").select("*").execute()
        data = response.data or []
        print(f"[DEBUG] ALL METRICS: {response.data}")
    except Exception as e:
        print(f"Failed to fetch metrics from Supabase: {e}")
        return {}

    from collections import defaultdict
    chart_data = defaultdict(list)

    for metric in data:
        chart_data[metric["metric_name"]].append({
            "x": metric["created_at"],
            "y": metric["value"]
        })

    # Sort by timestamp
    for series in chart_data.values():
        series.sort(key=lambda p: p["x"])

    print(f"[get_metrics_for_chart] Queried with: {server_name=}, {metric_name=}")
    print(f"[get_metrics_for_chart] Returning data: {chart_data}")

    return {
        "content": [
            {
                "type": "chart",
                "data": chart_data  # this is already { metric_name: [{x, y}, ...] }
            }
        ],
        "isError": False
    }

@mcp.tool()
def generate_metric_dashboard(metric_names, server_name=None):
    """
    Generates a visual dashboard for specified MCP metrics.
    
    Args:
        metric_names: List of metric names to include (e.g. ['temperature', 'wind']).
                     If None, all available metrics for the server will be included.
        server_name: Filter by MCP server name (e.g. 'weather', 'MCP Tracker').
    
    Returns:
        Dictionary with dashboard component code and configuration.
    """
    # 1. Fetch the metrics data using your existing functions
    metrics_data = get_metrics_for_chart(metric_name=metric_names, server_name=server_name)
    
    # 2. Generate the React component code with the data embedded
    # This could be a template that you fill in with the actual data
    dashboard_code = generate_react_component_from_template(
        metrics_data=metrics_data,
        metrics_included=metric_names,
        server_name=server_name or "All Servers"
    )
    
    return {
        "component_code": dashboard_code,
        "metrics_included": metric_names,
        "server_name": server_name or "All Servers",
        "type": "react_component"
    }

def generate_react_component_from_template(metrics_data, metrics_included, server_name):
    """Generate a React dashboard component from template with data embedded."""
    
    # Get the temperature data from metrics_data
    temperature_data = []
    if metrics_data and "content" in metrics_data:
        for content_item in metrics_data["content"]:
            if content_item["type"] == "chart" and "data" in content_item:
                if metrics_included in content_item["data"]:
                    temperature_data = content_item["data"][metrics_included]
    
    # This is your advanced dashboard template
    template = """
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

const MetricDashboard = () => {
  // Embedded data from your metrics
  const temperatureData = {{TEMPERATURE_DATA_JSON}};

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };
  
  // Format date for x-axis
  const formatXAxis = (dateString) => {
    const date = new Date(dateString);
    return `${date.getMonth()+1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
  };
  
  // Prepare data for chart
  const chartData = temperatureData.map(item => ({
    time: item.x,
    formattedTime: formatDate(item.x),
    temperature: item.y,
    timestamp: new Date(item.x).getTime() // For sorting
  }));
  
  // Sort data chronologically
  chartData.sort((a, b) => a.timestamp - b.timestamp);
  
  // Calculate statistics
  const currentTemp = chartData[chartData.length - 1].temperature;
  const minTemp = Math.min(...chartData.map(d => d.temperature));
  const maxTemp = Math.max(...chartData.map(d => d.temperature));
  const avgTemp = (chartData.reduce((sum, item) => sum + item.temperature, 0) / chartData.length).toFixed(1);
  
  // Determine temperature trend
  const tempTrend = chartData.length > 1 ? 
    (chartData[chartData.length - 1].temperature > chartData[chartData.length - 2].temperature ? 'rising' : 
    (chartData[chartData.length - 1].temperature < chartData[chartData.length - 2].temperature ? 'falling' : 'stable')) : 'stable';
  
  // Get temperature readings by day
  const today = new Date().toLocaleDateString();
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();
  
  const todayReadings = chartData.filter(d => new Date(d.time).toLocaleDateString() === today);
  const yesterdayReadings = chartData.filter(d => new Date(d.time).toLocaleDateString() === yesterday);
  
  const todayAvg = todayReadings.length ? 
    (todayReadings.reduce((sum, item) => sum + item.temperature, 0) / todayReadings.length).toFixed(1) : 'N/A';
  
  const yesterdayAvg = yesterdayReadings.length ? 
    (yesterdayReadings.reduce((sum, item) => sum + item.temperature, 0) / yesterdayReadings.length).toFixed(1) : 'N/A';

  return (
    <div className="p-4 bg-gray-50">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">{{METRIC_NAME}} Dashboard</h2>
        <div className="text-sm text-gray-500">
          Last updated: {chartData[chartData.length - 1].formattedTime}
        </div>
      </div>
      
      {/* Main temperature display */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Current {{METRIC_DISPLAY_NAME}}</h3>
            <div className="flex items-end">
              <span className="text-5xl font-bold text-indigo-600">{currentTemp}</span>
              <span className="text-2xl ml-1 text-gray-600">{{METRIC_UNIT}}</span>
              <span className={`ml-3 flex items-center ${tempTrend === 'rising' ? 'text-red-500' : tempTrend === 'falling' ? 'text-blue-500' : 'text-gray-500'}`}>
                {tempTrend === 'rising' && 
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                }
                {tempTrend === 'falling' && 
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                }
                {tempTrend === 'stable' && 
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  </svg>
                }
                <span className="ml-1">{tempTrend.charAt(0).toUpperCase() + tempTrend.slice(1)}</span>
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center px-4">
              <p className="text-sm text-gray-500">Low</p>
              <p className="text-2xl font-bold text-blue-500">{minTemp}{{METRIC_SYMBOL}}</p>
            </div>
            <div className="text-center px-4">
              <p className="text-sm text-gray-500">High</p>
              <p className="text-2xl font-bold text-red-500">{maxTemp}{{METRIC_SYMBOL}}</p>
            </div>
            <div className="text-center px-4">
              <p className="text-sm text-gray-500">Average</p>
              <p className="text-2xl font-bold text-purple-500">{avgTemp}{{METRIC_SYMBOL}}</p>
            </div>
            <div className="text-center px-4">
              <p className="text-sm text-gray-500">Readings</p>
              <p className="text-2xl font-bold text-gray-700">{chartData.length}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Temperature chart */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">{{METRIC_DISPLAY_NAME}} Trend</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 30 }}>
              <defs>
                <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis 
                dataKey="time" 
                tickFormatter={formatXAxis}
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                domain={[0, Math.max(maxTemp + 10, 80)]}
                label={{ value: '{{METRIC_UNIT}}', angle: -90, position: 'insideLeft', offset: -5 }}
              />
              <Tooltip 
                formatter={(value) => [`${value}{{METRIC_UNIT}}`, '{{METRIC_DISPLAY_NAME}}' ]}
                labelFormatter={(label) => formatDate(label)}
                contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '6px', border: '1px solid #e2e8f0' }}
              />
              <Area 
                type="monotone" 
                dataKey="temperature" 
                stroke="#8884d8" 
                fillOpacity={1}
                fill="url(#colorTemp)"
                strokeWidth={2}
                activeDot={{ r: 8, stroke: '#8884d8', strokeWidth: 2, fill: 'white' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">Daily Comparison</h3>
          <div className="flex justify-around items-center">
            <div className="text-center">
              <p className="text-sm text-gray-500">Yesterday Avg</p>
              <p className="text-2xl font-bold text-indigo-500">{yesterdayAvg !== 'N/A' ? `${yesterdayAvg}{{METRIC_SYMBOL}}` : 'N/A'}</p>
            </div>
            <div className="text-4xl text-gray-300">vs</div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Today Avg</p>
              <p className="text-2xl font-bold text-indigo-600">{todayAvg !== 'N/A' ? `${todayAvg}{{METRIC_SYMBOL}}` : 'N/A'}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">{{METRIC_DISPLAY_NAME}} Variability</h3>
          <div className="flex flex-col items-center">
            <div className="w-full bg-gray-200 rounded-full h-4 mb-3">
              <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-red-500 h-4 rounded-full" style={{ width: '100%' }}></div>
            </div>
            <div className="flex justify-between w-full text-sm">
              <span className="text-blue-500 font-semibold">{minTemp}{{METRIC_UNIT}}</span>
              <span className="text-purple-500 font-semibold">{avgTemp}{{METRIC_UNIT}}</span>
              <span className="text-red-500 font-semibold">{maxTemp}{{METRIC_UNIT}}</span>
            </div>
            <p className="mt-3 text-gray-600">{{METRIC_DISPLAY_NAME}} Range: <span className="font-bold">{(maxTemp - minTemp).toFixed(1)}{{METRIC_UNIT}}</span></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricDashboard;
    """
    
    # Define metric-specific display values based on the metric name
    metric_display_settings = {
        "temperature": {
            "display_name": "Temperature",
            "unit": "°F",
            "symbol": "°"
        },
        "wind": {
            "display_name": "Wind Speed",
            "unit": "mph",
            "symbol": ""
        },
        "humidity": {
            "display_name": "Humidity",
            "unit": "%",
            "symbol": "%"
        },
        "pressure": {
            "display_name": "Pressure",
            "unit": "hPa",
            "symbol": ""
        }
        # Add more metrics as needed
    }
    
    # Get display settings for the current metric
    settings = metric_display_settings.get(metrics_included, {
        "display_name": metrics_included.capitalize(),
        "unit": "",
        "symbol": ""
    })
    
    # Import json for data serialization
    import json
    
    # Replace placeholders in the template
    component_code = template.replace(
        "{{TEMPERATURE_DATA_JSON}}", 
        json.dumps(temperature_data, indent=2)
    ).replace(
        "{{METRIC_NAME}}", 
        settings["display_name"]
    ).replace(
        "{{METRIC_DISPLAY_NAME}}", 
        settings["display_name"]
    ).replace(
        "{{METRIC_UNIT}}", 
        settings["unit"]
    ).replace(
        "{{METRIC_SYMBOL}}", 
        settings["symbol"]
    )
    
    return component_code

# @mcp.tool()
# def generate_dashboard(server_name: Optional[str] = None, metric_names: Optional[List[str]] = None) -> Dict[str, Union[str, bool]]:
    """
    Generates a visual dashboard for MCP metrics and returns it as a base64-encoded image.
    
    Args:
        server_name: Filter by MCP server name (e.g. 'weather', 'MCP Tracker').
        metric_names: List of metric names to include (e.g. ['temperature', 'wind']).
                     If None, all available metrics for the server will be included.
    
    Returns:
        Dictionary with dashboard image as base64 string and status information.
    """
    try:
        # Get metrics data
        # query = supabase.table("mcp_metrics").select("*")
        # if server_name:
        #     query = query.eq("server_name", server_name)
        # if metric_names and len(metric_names) > 0:
        #     # Filter by the list of metric names
        #     query = query.in_("metric_name", metric_names)
        # 
        # response = query.execute()
        
        response = supabase.table("mcp_metrics").select("*").execute()
        data = response.data or []
        
        if not data:
            return {
                "content": f"No metrics data found for server: {server_name or 'all'}, metrics: {metric_names or 'all'}",
                "isError": True
            }
        
        # Organize data by metric name
        from collections import defaultdict
        metrics_data = defaultdict(list)
        
        for metric in data:
            metrics_data[metric["metric_name"]].append({
                "x": metric["created_at"],
                "y": metric["value"]
            })
        
        # Sort each series by timestamp
        for metric_name, series in metrics_data.items():
            metrics_data[metric_name] = sorted(series, key=lambda p: p["x"])
        
        # Generate the dashboard image
        # dashboard_image = _create_dashboard_image(metrics_data, server_name or "All Servers")
        
        return {
            "content": {
                "type": "data_only",  # Changed from "dashboard"
                # "image": dashboard_image,  # Comment this out
                "metrics_data": metrics_data,  # Return the actual data instead
                "metrics_included": list(metrics_data.keys()),
                "server_name": server_name or "All Servers"
            },
            "isError": False
        }
    
    except Exception as e:
        import sys  # Make sure to import sys at the top of your file
        print(f"Failed to generate dashboard: {e}", file=sys.stderr)
        return {
            "content": f"Error generating dashboard: {str(e)}",
            "isError": True
        }

# def _create_dashboard_image(metrics_data, server_name):
    """
    Creates a dashboard image from metrics data.
    
    Args:
        metrics_data: Dictionary mapping metric names to lists of data points.
        server_name: Name of the server for the title.
    
    Returns:
        Base64-encoded PNG image.
    """
    # Parse dates for plotting
    for metric_name, data_points in metrics_data.items():
        for point in data_points:
            # Convert ISO string to datetime
            if isinstance(point["x"], str):
                point["x"] = datetime.fromisoformat(point["x"].replace("Z", "+00:00"))
    
    # Create figure with subplots
    num_metrics = len(metrics_data)
    if num_metrics == 0:
        return ""
    
    fig = plt.figure(figsize=(12, 4 * num_metrics))
    fig.suptitle(f"{server_name} MCP Dashboard", fontsize=16, fontweight='bold')
    plt.figtext(0.5, 0.98, f"Real-time metrics from the MCP server", 
               ha='center', fontsize=12, color='dimgray')
    
    # Create a subplot for each metric
    gs = GridSpec(num_metrics, 1, figure=fig, hspace=0.4)
    
    for i, (metric_name, data) in enumerate(metrics_data.items()):
        # Skip if no data points
        if not data:
            continue
            
        # Create subplot
        ax = fig.add_subplot(gs[i])
        
        # Plot the data
        x_values = [point["x"] for point in data]
        y_values = [point["y"] for point in data]
        
        # Choose color and label based on metric name
        if metric_name.lower() == 'temperature':
            color = 'red'
            ylabel = 'Temperature (°F)'
        elif metric_name.lower() == 'wind':
            color = 'blue'
            ylabel = 'Wind Speed (mph)'
        else:
            color = 'green'
            ylabel = metric_name.title()
            
        ax.plot(x_values, y_values, marker='o', linestyle='-', color=color, 
                linewidth=2, markersize=6)
        
        # Add labels and grid
        ax.set_title(f"{metric_name.title()}", fontsize=14, pad=10)
        ax.set_ylabel(ylabel)
        ax.grid(True, linestyle='--', alpha=0.7)
        
        # Format x-axis dates
        ax.xaxis.set_major_formatter(mdates.DateFormatter('%m/%d %H:%M'))
        plt.setp(ax.xaxis.get_majorticklabels(), rotation=45, ha='right')
        
        # Add last updated timestamp
        last_update = max(x_values).strftime('%Y-%m-%d %H:%M:%S UTC')
        ax.annotate(f'Last updated: {last_update}', 
                   xy=(0.98, 0.05), xycoords='axes fraction',
                   ha='right', va='bottom', fontsize=8,
                   bbox=dict(boxstyle='round,pad=0.5', fc='#E8F0FF', ec='#CCDDFF', alpha=0.8))
    
    # Adjust layout
    plt.tight_layout(rect=[0, 0, 1, 0.97])
    
    # Convert plot to base64 string
    buffer = io.BytesIO()
    plt.savefig(buffer, format='png', dpi=100)
    plt.close(fig)
    buffer.seek(0)
    
    # Encode as base64
    image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
    return image_base64

def test_data():
    response = supabase.table("mcp_metrics").select("*").eq("metric_name", "temperature").execute()
    print(response.data)


if __name__ == "__main__":
    mcp.run(transport="stdio")
    # test_data()
