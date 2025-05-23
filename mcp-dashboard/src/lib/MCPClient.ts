// lib/MCPClient.ts

import { Tool, Resource, LogLevel } from '../types';

export class MCPClient {
  private wsConnection: WebSocket | null = null;
  private httpBaseUrl: string | null = null;
  private messageId = 1;
  private pendingRequests = new Map<number, (response: any) => void>();
  private onMessage: (direction: 'sent' | 'received', message: any) => void;
  private onLog: (level: LogLevel, message: string, details?: any) => void;
  private isInitialized = false;

  constructor(
    onMessage: (direction: 'sent' | 'received', message: any) => void,
    onLog: (level: LogLevel, message: string, details?: any) => void
  ) {
    this.onMessage = onMessage;
    this.onLog = onLog;
  }

  async connectStdio(command: string, args: string[], workingDir: string): Promise<any> {
    try {
      this.onLog('info', 'Connecting via stdio bridge...', { command, args, workingDir });
      
      const bridgeUrl = 'ws://localhost:8080/mcp-bridge';
      this.wsConnection = new WebSocket(bridgeUrl);
      
      return new Promise((resolve, reject) => {
        if (!this.wsConnection) {
          reject(new Error('Failed to create WebSocket connection'));
          return;
        }

        this.wsConnection.onopen = async () => {
          try {
            const connectMsg = {
              type: 'connect',
              command,
              args,
              workingDir
            };
            this.wsConnection!.send(JSON.stringify(connectMsg));
            
            const initResult = await this.initialize();
            resolve(initResult);
          } catch (error) {
            reject(error);
          }
        };

        this.wsConnection.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            this.onLog('error', 'Failed to parse WebSocket message', error);
          }
        };

        this.wsConnection.onerror = (error) => {
          this.onLog('error', 'WebSocket connection error', error);
          reject(error);
        };

        this.wsConnection.onclose = () => {
          this.onLog('info', 'WebSocket connection closed');
        };
      });
    } catch (error) {
      this.onLog('error', 'Failed to connect via stdio', error);
      throw error;
    }
  }

  async connectHttp(baseUrl: string): Promise<any> {
    try {
      this.httpBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      this.onLog('info', `Connecting to HTTP MCP server at ${this.httpBaseUrl}`);
      
      const initResult = await this.initialize();
      return initResult;
    } catch (error) {
      this.onLog('error', 'Failed to connect via HTTP', error);
      throw error;
    }
  }

  private async initialize(): Promise<any> {
    const initMessage = {
      jsonrpc: '2.0',
      id: this.messageId++,
      method: 'initialize',
      params: {
        protocolVersion: '2025-03-26',
        clientInfo: {
          name: 'MCP Inspector',
          version: '1.0.0'
        },
        capabilities: {
          roots: { listChanged: true },
          sampling: {}
        }
      }
    };

    try {
      this.onMessage('sent', initMessage);
      const response = await this.sendRequest(initMessage);
      this.onMessage('received', response);
      
      if (response.error) {
        throw new Error(`Initialize failed: ${response.error.message}`);
      }

      const initializedNotification = {
        jsonrpc: '2.0',
        method: 'notifications/initialized',
        params: {}
      };
      
      await this.sendNotification(initializedNotification);
      this.onMessage('sent', initializedNotification);
      this.isInitialized = true;
      
      this.onLog('success', 'MCP session initialized successfully');
      return response.result;
    } catch (error) {
      this.onLog('error', 'Failed to initialize MCP session', error);
      throw error;
    }
  }

  async listTools(): Promise<Tool[]> {
    if (!this.isInitialized) {
      throw new Error('Client not initialized');
    }

    const message = {
      jsonrpc: '2.0',
      id: this.messageId++,
      method: 'tools/list',
      params: {}
    };

    try {
      this.onMessage('sent', message);
      const response = await this.sendRequest(message);
      this.onMessage('received', response);
      
      if (response.error) {
        throw new Error(`List tools failed: ${response.error.message}`);
      }

      return response.result.tools || [];
    } catch (error) {
      this.onLog('error', 'Failed to list tools', error);
      throw error;
    }
  }

  async callTool(name: string, args: Record<string, any>): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('Client not initialized');
    }

    console.log('MCPClient.callTool called with:', { name, args });

    const message = {
      jsonrpc: '2.0',
      id: this.messageId++,
      method: 'tools/call',
      params: {
        name,
        arguments: args
      }
    };

    try {
      this.onMessage('sent', message);
      const response = await this.sendRequest(message);
      this.onMessage('received', response);
      
      if (response.error) {
        throw new Error(`Tool call failed: ${response.error.message}`);
      }

      return response.result;
    } catch (error) {
      this.onLog('error', `Failed to call tool ${name}`, error);
      throw error;
    }
  }

  async listResources(): Promise<Resource[]> {
    if (!this.isInitialized) {
      throw new Error('Client not initialized');
    }

    const message = {
      jsonrpc: '2.0',
      id: this.messageId++,
      method: 'resources/list',
      params: {}
    };

    try {
      this.onMessage('sent', message);
      const response = await this.sendRequest(message);
      this.onMessage('received', response);
      
      if (response.error) {
        throw new Error(`List resources failed: ${response.error.message}`);
      }

      return response.result.resources || [];
    } catch (error) {
      this.onLog('error', 'Failed to list resources', error);
      throw error;
    }
  }

  async readResource(uri: string): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('Client not initialized');
    }

    const message = {
      jsonrpc: '2.0',
      id: this.messageId++,
      method: 'resources/read',
      params: {
        uris: [uri]
      }
    };

    try {
      this.onMessage('sent', message);
      const response = await this.sendRequest(message);
      this.onMessage('received', response);
      
      if (response.error) {
        throw new Error(`Read resource failed: ${response.error.message}`);
      }

      return response.result.contents?.[0] || null;
    } catch (error) {
      this.onLog('error', `Failed to read resource ${uri}`, error);
      throw error;
    }
  }

  async listPrompts(): Promise<any[]> {
    if (!this.isInitialized) {
      throw new Error('Client not initialized');
    }

    const message = {
      jsonrpc: '2.0',
      id: this.messageId++,
      method: 'prompts/list',
      params: {}
    };

    try {
      this.onMessage('sent', message);
      const response = await this.sendRequest(message);
      this.onMessage('received', response);
      
      if (response.error) {
        throw new Error(`List prompts failed: ${response.error.message}`);
      }

      return response.result.prompts || [];
    } catch (error) {
      this.onLog('error', 'Failed to list prompts', error);
      throw error;
    }
  }

  private async sendRequest(message: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(message.id);
        reject(new Error('Request timeout'));
      }, 30000);

      this.pendingRequests.set(message.id, (response) => {
        clearTimeout(timeout);
        resolve(response);
      });

      if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
        this.wsConnection.send(JSON.stringify(message));
      } else if (this.httpBaseUrl) {
        this.sendHttpRequest(message).then(resolve).catch(reject);
      } else {
        reject(new Error('No active connection'));
      }
    });
  }

  private async sendNotification(message: any): Promise<void> {
    if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
      this.wsConnection.send(JSON.stringify(message));
    } else if (this.httpBaseUrl) {
      await this.sendHttpRequest(message);
    } else {
      throw new Error('No active connection');
    }
  }

  private async sendHttpRequest(message: any): Promise<any> {
    const response = await fetch(`${this.httpBaseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  private handleMessage(data: any): void {
    if (data.id && this.pendingRequests.has(data.id)) {
      const resolver = this.pendingRequests.get(data.id);
      this.pendingRequests.delete(data.id);
      resolver!(data);
    } else if (data.method) {
      this.onLog('info', `Received notification: ${data.method}`, data.params);
    }
  }

  disconnect(): void {
    this.isInitialized = false;
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
    this.httpBaseUrl = null;
    this.pendingRequests.clear();
    this.onLog('info', 'Disconnected from MCP server');
  }
}