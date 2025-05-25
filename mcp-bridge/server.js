// mcp-bridge/server.js
const WebSocket = require('ws');
const { spawn } = require('child_process');

const PORT = process.env.PORT || 8080;

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

console.log(`🌉 MCP Bridge Server started on ws://localhost:${PORT}/mcp-bridge`);
console.log(`📝 Ready to accept connections...\n`);

// Track active connections and processes for cleanup
const activeConnections = new Map();

wss.on('connection', (ws, req) => {
  const connectionId = Math.random().toString(36).substr(2, 9);
  console.log(`🔗 New connection from ${req.socket.remoteAddress} [${connectionId}]`);

  let mcpProcess = null;

  // Store connection for cleanup
  activeConnections.set(connectionId, { ws, mcpProcess: null });

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

        console.log(`[${connectionId}] 🚀 Starting MCP server: ${command} ${args.join(' ')}`);

        mcpProcess = spawn(command, args, {
          cwd: msg.workingDir || process.cwd(),
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, ...msg.env },
          shell: false
        });

        // Update stored connection
        activeConnections.set(connectionId, { ws, mcpProcess });

        let isInitialized = false;

        mcpProcess.on('spawn', () => {
          console.log(`[${connectionId}] ✅ MCP process spawned (PID: ${mcpProcess.pid})`);
        });

        mcpProcess.stdout.on('data', (data) => {
          if (isShuttingDown || ws.readyState !== WebSocket.OPEN) return;

          const lines = data.toString().split('\n').filter(line => line.trim());

          lines.forEach(line => {
            try {
              const parsed = JSON.parse(line);
              ws.send(line);

              if (!isInitialized && parsed.result) {
                isInitialized = true;
                console.log(`[${connectionId}] 🎉 MCP server initialized`);
              }

              console.log(`[${connectionId}] 📤 MCP → Browser: ${line.substring(0, 100)}...`);
            } catch (e) {
              console.log(`[${connectionId}] 📝 MCP stdout: ${line}`);
            }
          });
        });

        mcpProcess.stderr.on('data', (data) => {
          const errorText = data.toString().trim();
          console.log(`[${connectionId}] ⚠️  MCP stderr: ${errorText}`);
        });

        mcpProcess.on('exit', (code, signal) => {
          console.log(`[${connectionId}] 🔚 MCP process exited (code: ${code})`);

          // Clean up
          const connection = activeConnections.get(connectionId);
          if (connection) {
            connection.mcpProcess = null;
          }
        });

        mcpProcess.on('error', (error) => {
          console.error(`[${connectionId}] ❌ MCP process error: ${error.message}`);
        });

      } else {
        // Forward JSON-RPC messages to MCP process
        if (mcpProcess && mcpProcess.stdin && !mcpProcess.killed && !isShuttingDown) {
          const messageStr = JSON.stringify(msg) + '\n';
          mcpProcess.stdin.write(messageStr);
          console.log(`[${connectionId}] 📥 Browser → MCP: ${JSON.stringify(msg).substring(0, 100)}...`);
        }
      }
    } catch (error) {
      console.error(`[${connectionId}] ❌ Message error: ${error.message}`);
    }
  });

  ws.on('close', () => {
    console.log(`[${connectionId}] 🔌 WebSocket closed`);

    const connection = activeConnections.get(connectionId);
    if (connection && connection.mcpProcess && !connection.mcpProcess.killed) {
      console.log(`[${connectionId}] 🛑 Terminating MCP process...`);
      connection.mcpProcess.kill('SIGTERM');

      // Force kill after 2 seconds
      setTimeout(() => {
        if (connection.mcpProcess && !connection.mcpProcess.killed) {
          connection.mcpProcess.kill('SIGKILL');
        }
      }, 2000);
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
  console.log('\n🛑 Shutting down MCP Bridge Server...');

  // Kill all active processes
  activeConnections.forEach((connection, connectionId) => {
    if (connection.ws && connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.close();
    }

    if (connection.mcpProcess && !connection.mcpProcess.killed) {
      console.log(`[${connectionId}] 🛑 Killing MCP process...`);
      connection.mcpProcess.kill('SIGKILL');
    }
  });

  // Close server
  wss.close(() => {
    console.log('✅ Server shut down gracefully');
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