// Size-Limited MCP Bridge Server with 15s timeouts
const WebSocket = require('ws');
const { spawn } = require('child_process');
const path = require('path');

const PORT = process.env.PORT || 8080;
const REQUEST_TIMEOUT = 10000; // 15 seconds
const MAX_RESPONSE_SIZE = 50000; // 50KB max response size

// Prevent multiple signal handlers
let isShuttingDown = false;
let hasSignalHandlers = false;

const wss = new WebSocket.Server({
  port: PORT,
  path: '/mcp-bridge',
  verifyClient: (info) => {
    const origin = info.origin;
    return !origin || origin.includes('localhost') || origin.includes('127.0.0.1');
  }
});

// Increase max listeners to prevent warning
wss.setMaxListeners(20);

console.log(`🌉 Size-Limited MCP Bridge Server started on ws://localhost:${PORT}/mcp-bridge`);
console.log(`⏰ Request timeout: ${REQUEST_TIMEOUT}ms (10 seconds)`);
console.log(`📦 Max response size: ${MAX_RESPONSE_SIZE} bytes (${Math.round(MAX_RESPONSE_SIZE/1024)}KB)`);
console.log(`📝 Ready to accept connections...\n`);

// Track active connections and processes for cleanup
const activeConnections = new Map();

wss.on('connection', (ws, req) => {
  const connectionId = Math.random().toString(36).substr(2, 9);
  console.log(`🔗 New connection from ${req.socket.remoteAddress} [${connectionId}]`);

  let mcpProcess = null;
  
  // Track pending requests with timeouts and size limits
  const pendingRequests = new Map();

  // Store connection for cleanup
  activeConnections.set(connectionId, { ws, mcpProcess: null, pendingRequests });

  ws.on('message', (data) => {
    if (isShuttingDown) return;

    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'connect') {
        // Parse command and arguments properly
        let command, args;

        if (Array.isArray(msg.args) && msg.args.length > 0) {
          command = msg.command;
          args = msg.args;
        } else if (typeof msg.command === 'string') {
          const parts = msg.command.trim().split(/\s+/);
          command = parts[0];
          args = parts.slice(1);

          if (Array.isArray(msg.args)) {
            args = args.concat(msg.args);
          }
        } else {
          throw new Error('Invalid command format');
        }

        // Enhanced logging
        const workingDir = msg.workingDir || process.cwd();
        console.log(`[${connectionId}] 📂 Working directory: ${workingDir}`);
        console.log(`[${connectionId}] 🚀 Starting MCP server: ${command} ${args.join(' ')}`);
        console.log(`[${connectionId}] 🔧 Environment variables:`, msg.env || 'none');

        // Check if working directory exists
        const fs = require('fs');
        if (!fs.existsSync(workingDir)) {
          console.error(`[${connectionId}] ❌ Working directory does not exist: ${workingDir}`);
          ws.send(JSON.stringify({
            type: 'error',
            message: `Working directory does not exist: ${workingDir}`
          }));
          return;
        }

        mcpProcess = spawn(command, args, {
          cwd: workingDir,
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, ...msg.env },
          shell: false
        });

        // Update stored connection
        activeConnections.set(connectionId, { ws, mcpProcess, pendingRequests });

        let isInitialized = false;
        let stderrBuffer = '';
        let stdoutBuffer = '';
        let currentLineBuffer = '';
        let totalResponseSize = 0;

        mcpProcess.on('spawn', () => {
          console.log(`[${connectionId}] ✅ MCP process spawned (PID: ${mcpProcess.pid})`);
        });

        mcpProcess.stdout.on('data', (data) => {
          if (isShuttingDown || ws.readyState !== WebSocket.OPEN) return;

          const dataStr = data.toString();
          stdoutBuffer += dataStr;
          currentLineBuffer += dataStr;
          totalResponseSize += dataStr.length;
          
          // Check total response size limit
          if (totalResponseSize > MAX_RESPONSE_SIZE) {
            console.log(`[${connectionId}] 📦 Response size limit exceeded (${totalResponseSize} bytes), truncating...`);
            
            // Find any pending requests and send size limit error
            pendingRequests.forEach((requestInfo, id) => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                  jsonrpc: "2.0",
                  id: id,
                  error: {
                    code: -32603,
                    message: `Response too large (${Math.round(totalResponseSize/1024)}KB). Server should implement size limiting.`
                  }
                }));
              }
              clearTimeout(requestInfo.timeout);
              pendingRequests.delete(id);
            });
            
            // Reset buffers to prevent further issues
            currentLineBuffer = '';
            totalResponseSize = 0;
            return;
          }
          
          // Process complete JSON lines with size awareness
          const lines = currentLineBuffer.split('\n');
          currentLineBuffer = lines.pop() || ''; // Keep incomplete line in buffer
          
          lines.filter(line => line.trim()).forEach(line => {
            try {
              const parsed = JSON.parse(line);
              
              // Check individual response size
              if (line.length > MAX_RESPONSE_SIZE / 2) {
                console.log(`[${connectionId}] 📦 Individual response too large (${line.length} bytes), truncating...`);
                
                if (parsed.id && pendingRequests.has(parsed.id)) {
                  const requestInfo = pendingRequests.get(parsed.id);
                  clearTimeout(requestInfo.timeout);
                  pendingRequests.delete(parsed.id);
                  
                  // Send size limit error instead
                  if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                      jsonrpc: "2.0",
                      id: parsed.id,
                      error: {
                        code: -32603,
                        message: `Response too large (${Math.round(line.length/1024)}KB). Content truncated for performance.`
                      }
                    }));
                  }
                }
                return;
              }
              
              // Track response time for requests
              if (parsed.id && pendingRequests.has(parsed.id)) {
                const requestInfo = pendingRequests.get(parsed.id);
                const responseTime = Date.now() - requestInfo.startTime;
                const sizeKB = Math.round(line.length / 1024);
                console.log(`[${connectionId}] ⚡ ${requestInfo.method} completed in ${responseTime}ms (${sizeKB}KB)`);
                
                // Clear timeout
                clearTimeout(requestInfo.timeout);
                pendingRequests.delete(parsed.id);
              }

              // Send response to browser
              ws.send(line);

              if (!isInitialized && parsed.result) {
                isInitialized = true;
                console.log(`[${connectionId}] 🎉 MCP server initialized`);
              }

              const previewLength = Math.min(line.length, 150);
              console.log(`[${connectionId}] 📤 MCP → Browser: ${line.substring(0, previewLength)}...`);
              
            } catch (e) {
              console.log(`[${connectionId}] 📝 MCP stdout: ${line.substring(0, 100)}...`);
            }
          });
        });

        mcpProcess.stderr.on('data', (data) => {
          const errorText = data.toString().trim();
          stderrBuffer += errorText + '\n';
          console.log(`[${connectionId}] ⚠️  MCP stderr: ${errorText}`);
        });

        mcpProcess.on('exit', (code, signal) => {
          console.log(`[${connectionId}] 🔚 MCP process exited (code: ${code}, signal: ${signal})`);
          
          // Clear all pending request timeouts and notify of process exit
          pendingRequests.forEach((requestInfo, id) => {
            clearTimeout(requestInfo.timeout);
            console.log(`[${connectionId}] ❌ Request ${id} (${requestInfo.method}) cancelled due to process exit`);
            
            // Send process exit error to browser
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                jsonrpc: "2.0",
                id: id,
                error: {
                  code: -32603,
                  message: `MCP process exited unexpectedly (code: ${code})`
                }
              }));
            }
          });
          pendingRequests.clear();
          
          // If process exited immediately with error, send detailed info
          if (code !== 0 || (code === 0 && !isInitialized)) {
            console.log(`[${connectionId}] 📝 Full stdout:`, stdoutBuffer || 'empty');
            console.log(`[${connectionId}] ⚠️  Full stderr:`, stderrBuffer || 'empty');
            
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'process_exit',
                code,
                signal,
                stdout: stdoutBuffer,
                stderr: stderrBuffer,
                message: code === 0 
                  ? 'Process exited successfully but may not have initialized properly'
                  : `Process exited with error code ${code}`
              }));
            }
          }

          // Clean up
          const connection = activeConnections.get(connectionId);
          if (connection) {
            connection.mcpProcess = null;
          }
        });

        mcpProcess.on('error', (error) => {
          console.error(`[${connectionId}] ❌ MCP process error: ${error.message}`);
          console.error(`[${connectionId}] 📋 Error details:`, error);
          
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'process_error',
              message: error.message,
              code: error.code,
              errno: error.errno,
              syscall: error.syscall,
              path: error.path
            }));
          }
        });

        // Add timeout for initialization
        setTimeout(() => {
          if (!isInitialized && mcpProcess && !mcpProcess.killed) {
            console.log(`[${connectionId}] ⏰ MCP server initialization timeout (10s)`);
            console.log(`[${connectionId}] 📝 Stdout so far:`, stdoutBuffer || 'empty');
            console.log(`[${connectionId}] ⚠️  Stderr so far:`, stderrBuffer || 'empty');
          }
        }, 10000); // 10 second timeout for initialization

      } else {
        // Forward JSON-RPC messages to MCP process with size limiting and timeouts
        if (mcpProcess && mcpProcess.stdin && !mcpProcess.killed && !isShuttingDown) {
          const messageStr = JSON.stringify(msg) + '\n';
          
          // Check request size
          if (messageStr.length > MAX_RESPONSE_SIZE / 4) {
            console.log(`[${connectionId}] 📦 Request too large (${messageStr.length} bytes), rejecting...`);
            
            if (msg.id && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                jsonrpc: "2.0",
                id: msg.id,
                error: {
                  code: -32603,
                  message: `Request too large (${Math.round(messageStr.length/1024)}KB). Please reduce request size.`
                }
              }));
            }
            return;
          }
          
          mcpProcess.stdin.write(messageStr);
          
          // Track request with 15s timeout
          if (msg.id && msg.method) {
            const requestInfo = {
              method: msg.method,
              startTime: Date.now(),
              timeout: setTimeout(() => {
                console.log(`[${connectionId}] ⏰ 15s timeout: ${msg.method} (ID: ${msg.id})`);
                pendingRequests.delete(msg.id);
                
                // Send timeout error to browser
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({
                    jsonrpc: "2.0",
                    id: msg.id,
                    error: {
                      code: -32603,
                      message: `Request timeout after 15 seconds. Server should implement faster response handling.`
                    }
                  }));
                }
              }, REQUEST_TIMEOUT)
            };
            
            pendingRequests.set(msg.id, requestInfo);
            
            const sizeKB = Math.round(messageStr.length / 1024);
            console.log(`[${connectionId}] 📥 ${msg.method} (ID: ${msg.id}) - 15s timeout, ${sizeKB}KB`);
          } else {
            console.log(`[${connectionId}] 📥 Browser → MCP: ${JSON.stringify(msg).substring(0, 100)}...`);
          }
        } else {
          console.log(`[${connectionId}] ⚠️  Cannot send message - process not available`);
          
          // Send error response if this was a request with ID
          if (msg.id && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              jsonrpc: "2.0",
              id: msg.id,
              error: {
                code: -32603,
                message: "MCP process not available"
              }
            }));
          }
        }
      }
    } catch (error) {
      console.error(`[${connectionId}] ❌ Message error: ${error.message}`);
      console.error(`[${connectionId}] 📋 Full error:`, error);
    }
  });

  ws.on('close', () => {
    console.log(`[${connectionId}] 🔌 WebSocket closed`);

    const connection = activeConnections.get(connectionId);
    if (connection) {
      // Clear all pending request timeouts
      if (connection.pendingRequests) {
        connection.pendingRequests.forEach((requestInfo, id) => {
          clearTimeout(requestInfo.timeout);
        });
        connection.pendingRequests.clear();
      }
      
      if (connection.mcpProcess && !connection.mcpProcess.killed) {
        console.log(`[${connectionId}] 🛑 Terminating MCP process...`);
        connection.mcpProcess.kill('SIGTERM');

        // Force kill after 2 seconds
        setTimeout(() => {
          if (connection.mcpProcess && !connection.mcpProcess.killed) {
            connection.mcpProcess.kill('SIGKILL');
          }
        }, 2000);
      }
    }

    activeConnections.delete(connectionId);
  });

  ws.on('error', (error) => {
    console.error(`[${connectionId}] ❌ WebSocket error: ${error.message}`);
  });
});

// Single shutdown handler
function shutdown() {
  if (isShuttingDown) {
    console.log('\n💀 Force exit...');
    process.exit(1);
  }

  isShuttingDown = true;
  console.log('\n🛑 Shutting down Size-Limited MCP Bridge Server...');

  // Kill all active processes and clear timeouts
  activeConnections.forEach((connection, connectionId) => {
    if (connection.ws && connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.close();
    }

    // Clear pending timeouts
    if (connection.pendingRequests) {
      connection.pendingRequests.forEach((requestInfo) => {
        clearTimeout(requestInfo.timeout);
      });
      connection.pendingRequests.clear();
    }

    if (connection.mcpProcess && !connection.mcpProcess.killed) {
      console.log(`[${connectionId}] 🛑 Killing MCP process...`);
      connection.mcpProcess.kill('SIGKILL');
    }
  });

  // Close server
  wss.close(() => {
    console.log('✅ Size-Limited Server shut down gracefully');
    process.exit(0);
  });

  // Force exit after 3 seconds
  setTimeout(() => {
    console.log('💀 Force exit after timeout');
    process.exit(1);
  }, 3000);
}

// Register signal handlers only once
if (!hasSignalHandlers) {
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  hasSignalHandlers = true;
}