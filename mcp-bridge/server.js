// mcp-bridge/server.js
const WebSocket = require('ws');
const { spawn } = require('child_process');
const path = require('path');

const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ 
  port: PORT, 
  path: '/mcp-bridge',
  verifyClient: (info) => {
    const origin = info.origin;
    return !origin || origin.includes('localhost') || origin.includes('127.0.0.1');
  }
});

console.log(`🌉 MCP Bridge Server started on ws://localhost:${PORT}/mcp-bridge`);
console.log(`📝 Ready to accept connections...\n`);

wss.on('connection', (ws, req) => {
  console.log(`🔗 New connection from ${req.socket.remoteAddress}`);
  
  let mcpProcess = null;
  let connectionId = Math.random().toString(36).substr(2, 9);
  
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      
      if (msg.type === 'connect') {
        // Parse command and arguments properly
        let command, args;
        
        if (Array.isArray(msg.args) && msg.args.length > 0) {
          // If args is provided as array: command="python", args=["weather.py"]
          command = msg.command;
          args = msg.args;
        } else if (typeof msg.command === 'string') {
          // If command is a string like "python weather.py" or "uv run weather.py"
          const parts = msg.command.trim().split(/\s+/);
          command = parts[0];
          args = parts.slice(1);
          
          // Add any additional args from msg.args
          if (Array.isArray(msg.args)) {
            args = args.concat(msg.args);
          }
        } else {
          throw new Error('Invalid command format');
        }
        
        console.log(`[${connectionId}] 🚀 Starting MCP server:`);
        console.log(`[${connectionId}]    Command: "${command}"`);
        console.log(`[${connectionId}]    Args: [${args.map(a => `"${a}"`).join(', ')}]`);
        console.log(`[${connectionId}]    Working Dir: "${msg.workingDir || process.cwd()}"`);
        
        // Validate command exists
        if (!command || command.trim() === '') {
          throw new Error('Command cannot be empty');
        }
        
        // Spawn MCP server process with proper command/args separation
        mcpProcess = spawn(command, args, {
          cwd: msg.workingDir || process.cwd(),
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, ...msg.env },
          shell: false // Don't use shell to avoid command injection
        });
        
        let isInitialized = false;
        
        // Handle process startup
        mcpProcess.on('spawn', () => {
          console.log(`[${connectionId}] ✅ MCP process spawned successfully (PID: ${mcpProcess.pid})`);
        });
        
        // Forward stdout (JSON-RPC messages) to WebSocket
        mcpProcess.stdout.on('data', (data) => {
          const lines = data.toString().split('\n').filter(line => line.trim());
          
          lines.forEach(line => {
            try {
              // Try to parse as JSON to validate it's a proper JSON-RPC message
              const parsed = JSON.parse(line);
              ws.send(line);
              
              if (!isInitialized && parsed.result) {
                isInitialized = true;
                console.log(`[${connectionId}] 🎉 MCP server initialized successfully`);
              }
              
              console.log(`[${connectionId}] 📤 MCP → Browser: ${line.substring(0, 150)}${line.length > 150 ? '...' : ''}`);
            } catch (e) {
              // Non-JSON output (logs, etc.)
              console.log(`[${connectionId}] 📝 MCP stdout: ${line}`);
            }
          });
        });
        
        mcpProcess.stderr.on('data', (data) => {
          const errorText = data.toString().trim();
          console.log(`[${connectionId}] ⚠️  MCP stderr: ${errorText}`);
          
          // Forward error to client
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              jsonrpc: '2.0',
              error: {
                code: -32000,
                message: `MCP Server Error: ${errorText}`
              }
            }));
          }
        });
        
        mcpProcess.on('exit', (code, signal) => {
          console.log(`[${connectionId}] 🔚 MCP process exited with code ${code}${signal ? `, signal ${signal}` : ''}`);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              jsonrpc: '2.0',
              error: {
                code: -32001,
                message: `MCP process exited with code ${code}`
              }
            }));
            ws.close();
          }
        });
        
        mcpProcess.on('error', (error) => {
          console.error(`[${connectionId}] ❌ MCP process error: ${error.message}`);
          
          // Provide helpful error messages
          let errorMessage = error.message;
          if (error.code === 'ENOENT') {
            errorMessage = `Command not found: "${command}". Please check:\n` +
                          `1. The command is installed and in PATH\n` +
                          `2. The command name is spelled correctly\n` +
                          `3. For "uv": use command="uv" and args=["run", "weather.py"]\n` +
                          `4. For "python": use command="python" and args=["weather.py"]`;
          }
          
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ 
              jsonrpc: '2.0', 
              error: { 
                code: -32000, 
                message: errorMessage
              } 
            }));
          }
        });
        
      } else {
        // Forward JSON-RPC messages to MCP process
        if (mcpProcess && mcpProcess.stdin && !mcpProcess.killed) {
          const messageStr = JSON.stringify(msg) + '\n';
          mcpProcess.stdin.write(messageStr);
          console.log(`[${connectionId}] 📥 Browser → MCP: ${JSON.stringify(msg).substring(0, 150)}${JSON.stringify(msg).length > 150 ? '...' : ''}`);
        } else {
          console.log(`[${connectionId}] ⚠️  No active MCP process to send message to`);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              jsonrpc: '2.0',
              error: {
                code: -32002,
                message: 'No active MCP process'
              }
            }));
          }
        }
      }
    } catch (error) {
      console.error(`[${connectionId}] ❌ Message parsing error: ${error.message}`);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32700,
            message: `Parse error: ${error.message}`
          }
        }));
      }
    }
  });
  
  ws.on('close', () => {
    console.log(`[${connectionId}] 🔌 WebSocket connection closed`);
    if (mcpProcess && !mcpProcess.killed) {
      console.log(`[${connectionId}] 🛑 Terminating MCP process...`);
      mcpProcess.kill('SIGTERM');
      
      // Force kill after 5 seconds if it doesn't exit gracefully
      setTimeout(() => {
        if (mcpProcess && !mcpProcess.killed) {
          console.log(`[${connectionId}] 💀 Force killing MCP process...`);
          mcpProcess.kill('SIGKILL');
        }
      }, 5000);
    }
  });
  
  ws.on('error', (error) => {
    console.error(`[${connectionId}] ❌ WebSocket error: ${error.message}`);
  });
});

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down MCP Bridge Server...');
  wss.close(() => {
    console.log('✅ Server shut down gracefully');
    process.exit(0);
  });
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});