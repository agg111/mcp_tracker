#!/usr/bin/env python3
"""
MCP Resource Tool for Reading Application Log Files
"""
# /// script
# requires-python = ">=3.8"
# dependencies = [
#     "mcp>=1.0.0",
#     "pydantic>=2.0.0",
# ]
# ///

import asyncio
import os
import sys
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp import types
from pydantic import AnyUrl


# Initialize the MCP server
app = Server("log-reader-server")

# Configuration - adjust these paths as needed
LOG_FILE_PATH = "/var/log/app.log"  # Default log file path
FALLBACK_LOG_PATH = "./app.log"     # Fallback for development


async def read_log_file(file_path: str = None) -> str:
    """
    Read the contents of a log file with proper error handling.
    
    Args:
        file_path: Optional path to the log file. If None, uses default paths.
        
    Returns:
        str: Contents of the log file
        
    Raises:
        FileNotFoundError: If the log file doesn't exist
        PermissionError: If unable to read the log file
    """
    if file_path is None:
        # Try default path first, then fallback
        if os.path.exists(LOG_FILE_PATH):
            file_path = LOG_FILE_PATH
        elif os.path.exists(FALLBACK_LOG_PATH):
            file_path = FALLBACK_LOG_PATH
        else:
            # Create a sample log file for demonstration
            file_path = FALLBACK_LOG_PATH
            await create_sample_log_file(file_path)
    
    try:
        # Read the file asynchronously
        with open(file_path, 'r', encoding='utf-8') as f:
            contents = f.read()
        
        # If file is empty, return a helpful message
        if not contents.strip():
            return f"Log file at {file_path} is empty."
            
        return contents
        
    except FileNotFoundError:
        raise FileNotFoundError(f"Log file not found at {file_path}")
    except PermissionError:
        raise PermissionError(f"Permission denied reading log file at {file_path}")
    except Exception as e:
        raise Exception(f"Error reading log file: {str(e)}")


async def create_sample_log_file(file_path: str) -> None:
    """Create a sample log file for demonstration purposes."""
    sample_logs = """2024-05-24 10:00:01 [INFO] Application started successfully
2024-05-24 10:00:02 [INFO] Database connection established
2024-05-24 10:05:15 [WARN] High memory usage detected: 85%
2024-05-24 10:10:30 [INFO] Processing batch job #1234
2024-05-24 10:15:45 [ERROR] Failed to connect to external API: timeout
2024-05-24 10:16:00 [INFO] Retrying external API connection
2024-05-24 10:16:05 [INFO] External API connection restored
2024-05-24 10:20:00 [INFO] Batch job #1234 completed successfully
2024-05-24 10:25:30 [DEBUG] Garbage collection triggered
2024-05-24 10:30:00 [INFO] Hourly health check passed
"""
    
    # Ensure directory exists
    Path(file_path).parent.mkdir(parents=True, exist_ok=True)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(sample_logs)


@app.list_resources()
async def list_resources() -> list[types.Resource]:
    """
    List available log resources.
    
    Returns:
        list[types.Resource]: List of available log file resources
    """
    resources = []
    
    # Check which log files are available
    log_files = [
        {
            "path": LOG_FILE_PATH,
            "uri": "file:///var/log/app.log",
            "name": "Application Logs (Production)",
            "description": "Main application log file"
        },
        {
            "path": FALLBACK_LOG_PATH,
            "uri": "file://./app.log",
            "name": "Application Logs (Local)",
            "description": "Local development log file"
        }
    ]
    
    for log_info in log_files:
        if os.path.exists(log_info["path"]) or log_info["path"] == FALLBACK_LOG_PATH:
            resources.append(
                types.Resource(
                    uri=log_info["uri"],
                    name=log_info["name"],
                    description=log_info["description"],
                    mimeType="text/plain"
                )
            )
    
    return resources


@app.read_resource()
async def read_resource(uri: AnyUrl) -> str:
    """
    Read the contents of a specific log resource.
    
    Args:
        uri: The URI of the resource to read
        
    Returns:
        str: Contents of the requested resource
        
    Raises:
        ValueError: If the resource is not found or cannot be read
    """
    uri_str = str(uri)
    
    try:
        # Map URIs to file paths
        uri_to_path = {
            "file:///var/log/app.log": LOG_FILE_PATH,
            "file://./app.log": FALLBACK_LOG_PATH,
            "file:///logs/app.log": LOG_FILE_PATH,  # Support original sample URI
        }
        
        if uri_str in uri_to_path:
            file_path = uri_to_path[uri_str]
            log_contents = await read_log_file(file_path)
            return log_contents
        else:
            # Try to parse as a file URI and extract path
            parsed = urlparse(uri_str)
            if parsed.scheme == 'file':
                file_path = parsed.path
                if os.path.exists(file_path):
                    log_contents = await read_log_file(file_path)
                    return log_contents
        
        raise ValueError(f"Resource not found: {uri_str}")
        
    except (FileNotFoundError, PermissionError) as e:
        raise ValueError(f"Cannot read resource {uri_str}: {str(e)}")
    except Exception as e:
        raise ValueError(f"Error accessing resource {uri_str}: {str(e)}")


async def main():
    """Main entry point for the MCP server."""
    try:
        # Start the server with stdio transport
        async with stdio_server() as streams:
            await app.run(
                streams[0],  # stdin
                streams[1],  # stdout
                app.create_initialization_options()
            )
    except KeyboardInterrupt:
        print("Server stopped by user", file=sys.stderr)
    except Exception as e:
        print(f"Server error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    # Run the server
    asyncio.run(main())
