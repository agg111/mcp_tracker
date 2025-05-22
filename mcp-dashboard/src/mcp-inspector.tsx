import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Trash2, Settings, Bug, Clock, CheckCircle, XCircle, ChevronDown, ChevronRight, Copy, ExternalLink } from 'lucide-react';

interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: {
      [key: string]: {
        type: string;
        description?: string;
        enum?: string[];
        default?: string | number;
      };
    };
    required?: string[];
  };
}

interface Resource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  size?: number;
  lastModified?: number;
}

interface ServerInfo {
  name: string;
  version: string;
  protocolVersion?: string;
}

interface ToolResult {
  id: number;
  toolName: string;
  inputs: Record<string, any>;
  timestamp: string;
  status: 'success' | 'error';
  duration: number;
  result: any;
  error: string | null;
}

type LogLevel = 'info' | 'success' | 'error' | 'warning';
type LogDetails = Record<string, any> | null;

interface PromptArgument {
  name: string;
  description: string;
  type: string;
  required: boolean;
}

interface MessageContent {
  type: string;
  text: string;
}

interface Message {
  role: string;
  content: MessageContent[];
}

// MCP Client class to handle real server communication
class MCPClient {
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
    // For stdio connections, we need a bridge service since browsers can't spawn processes
    // This would typically connect to a WebSocket bridge service
    try {
      this.onLog('info', 'Connecting via stdio bridge...', { command, args, workingDir });
      
      // Connect to a WebSocket bridge service (you'd need to implement this)
      const bridgeUrl = 'ws://localhost:8080/mcp-bridge';
      this.wsConnection = new WebSocket(bridgeUrl);
      
      return new Promise((resolve, reject) => {
        if (!this.wsConnection) {
          reject(new Error('Failed to create WebSocket connection'));
          return;
        }

        this.wsConnection.onopen = async () => {
          try {
            // Send connection request to bridge
            const connectMsg = {
              type: 'connect',
              command,
              args,
              workingDir
            };
            this.wsConnection!.send(JSON.stringify(connectMsg));
            
            // Initialize MCP session
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
      
      // Initialize MCP session
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

      // Send initialized notification
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
      // Handle notifications
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

const MCPInspector = () => {
  const [activeTab, setActiveTab] = useState('connection');
  const [connectionConfig, setConnectionConfig] = useState({
    type: 'stdio',
    command: '',
    subcommand: '',
    filename: '',
    extraArgs: '',
    args: ['', ''], // This will be auto-generated
    workingDir: '',
    httpUrl: 'http://localhost:8000'
  });
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [capabilities, setCapabilities] = useState<Record<string, any> | null>(null);
  const [mcpClient, setMcpClient] = useState<MCPClient | null>(null);
  
  // Tools related state
  const [availableTools, setAvailableTools] = useState<Tool[]>([]);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [toolInputs, setToolInputs] = useState<Record<string, any>>({});
  const [toolResults, setToolResults] = useState<ToolResult[]>([]);
  const [isExecutingTool, setIsExecutingTool] = useState(false);
  
  // Resources related state
  const [availableResources, setAvailableResources] = useState<Resource[]>([]);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [resourceContent, setResourceContent] = useState<any | null>(null);
  
  // Prompts related state
  const [availablePrompts, setAvailablePrompts] = useState<any[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<any | null>(null);
  const [promptInputs, setPromptInputs] = useState<Record<string, string | number>>({});
  const [promptResult, setPromptResult] = useState<any | null>(null);
  
  // Logs and debugging
  const [logs, setLogs] = useState<any[]>([]);
  const [rawMessages, setRawMessages] = useState<any[]>([]);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs, rawMessages]);

  const addLog = (level: LogLevel, message: string, details: LogDetails = null) => {
    const newLog = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      level,
      message,
      details
    };
    setLogs(prev => [...prev, newLog]);
  };

  const addRawMessage = (direction: 'sent' | 'received', message: Record<string, any>) => {
    const newMessage = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      direction,
      message: JSON.stringify(message, null, 2)
    };
    setRawMessages(prev => [...prev, newMessage]);
  };

  const handleConnect = async () => {
    setConnectionStatus('connecting');
    addLog('info', 'Attempting to connect to MCP server', connectionConfig);
    
    try {
      const client = new MCPClient(addRawMessage, addLog);
      
      let initResult;
      if (connectionConfig.type === 'stdio') {
        // Use the args that are automatically built from the separate inputs
        const cleanArgs = connectionConfig.args.filter(arg => arg && arg.trim().length > 0);
        
        initResult = await client.connectStdio(
          connectionConfig.command.trim(),
          cleanArgs,
          connectionConfig.workingDir
        );
      } else {
        initResult = await client.connectHttp(connectionConfig.httpUrl);
      }
      
      setMcpClient(client);
      setIsConnected(true);
      setConnectionStatus('connected');
      setServerInfo(initResult.serverInfo || { name: 'MCP Server', version: 'Unknown' });
      setCapabilities(initResult.capabilities || {});
      
      // Load available tools, resources, and prompts
      await loadServerCapabilities(client, initResult.capabilities || {});
      
      addLog('success', 'Successfully connected to MCP server');
    } catch (error) {
      setConnectionStatus('disconnected');
      addLog('error', 'Failed to connect to MCP server', error as LogDetails);
    }
  };

  const loadServerCapabilities = async (client: MCPClient, serverCapabilities: Record<string, any>) => {
    try {
      // Load tools
      if (serverCapabilities?.tools !== undefined) {
        addLog('info', 'Loading available tools...');
        const tools = await client.listTools();
        console.log('Loaded tools:', tools); // Debug log
        setAvailableTools(tools);
        addLog('success', `Loaded ${tools.length} tools: ${tools.map(t => t.name).join(', ')}`);
      } else {
        addLog('info', 'Server does not support tools');
      }
      
      // Load resources
      if (serverCapabilities?.resources !== undefined) {
        addLog('info', 'Loading available resources...');
        const resources = await client.listResources();
        setAvailableResources(resources);
        addLog('success', `Loaded ${resources.length} resources`);
      } else {
        addLog('info', 'Server does not support resources');
      }
      
      // Load prompts
      if (serverCapabilities?.prompts !== undefined) {
        addLog('info', 'Loading available prompts...');
        const prompts = await client.listPrompts();
        setAvailablePrompts(prompts);
        addLog('success', `Loaded ${prompts.length} prompts`);
      } else {
        addLog('info', 'Server does not support prompts');
      }
    } catch (error) {
      addLog('error', 'Failed to load server capabilities', error as LogDetails);
      console.error('Failed to load capabilities:', error);
    }
  };

  const handleDisconnect = () => {
    if (mcpClient) {
      mcpClient.disconnect();
      setMcpClient(null);
    }
    setIsConnected(false);
    setConnectionStatus('disconnected');
    setServerInfo(null);
    setCapabilities(null);
    setAvailableTools([]);
    setAvailableResources([]);
    setAvailablePrompts([]);
    addLog('info', 'Disconnected from MCP server');
  };

  const handleExecuteTool = async () => {
    if (!selectedTool || !mcpClient) return;
    
    setIsExecutingTool(true);
    const startTime = Date.now();
    
    // Debug log the tool inputs
    console.log('Executing tool with inputs:', toolInputs);
    addLog('info', `Executing tool: ${selectedTool.name}`, toolInputs);

    try {
      const result = await mcpClient.callTool(selectedTool.name, toolInputs);
      const duration = Date.now() - startTime;
      
      const toolResult: ToolResult = {
        id: Date.now(),
        toolName: selectedTool.name,
        inputs: { ...toolInputs },
        timestamp: new Date().toISOString(),
        status: result.isError ? 'error' : 'success',
        duration,
        result: result.isError ? null : result,
        error: result.isError ? (result.content?.[0]?.text || result.error?.message || 'Unknown error') : null
      };

      setToolResults(prev => [toolResult, ...prev]);
      addLog(result.isError ? 'error' : 'success', 
            `Tool ${result.isError ? 'failed' : 'executed successfully'}: ${selectedTool.name}`);
    } catch (error) {
      const duration = Date.now() - startTime;
      const toolResult: ToolResult = {
        id: Date.now(),
        toolName: selectedTool.name,
        inputs: { ...toolInputs },
        timestamp: new Date().toISOString(),
        status: 'error',
        duration,
        result: null,
        error: error instanceof Error ? error.message : String(error)
      };

      setToolResults(prev => [toolResult, ...prev]);
      addLog('error', `Tool execution failed: ${selectedTool.name}`, error as LogDetails);
    } finally {
      setIsExecutingTool(false);
    }
  };

  const handleResourceRead = async (resource: Resource) => {
    if (!mcpClient) return;
    
    addLog('info', `Reading resource: ${resource.name}`);
    try {
      const content = await mcpClient.readResource(resource.uri);
      setResourceContent(content);
      addLog('success', `Resource read successfully: ${resource.name}`);
    } catch (error) {
      addLog('error', `Failed to read resource: ${resource.name}`, error as LogDetails);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addLog('info', 'Content copied to clipboard');
  };

  const toggleLogExpansion = (logId: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  const clearLogs = () => {
    setLogs([]);
    setRawMessages([]);
    setExpandedLogs(new Set());
  };

  const renderToolInput = (property: string, schema: { type: string; description?: string; enum?: string[] }) => {
    const value = toolInputs[property] || '';
    
    // Helper function to update input with trimming
    const updateValue = (newValue: any) => {
      // Trim strings but preserve other types as-is
      const trimmedValue = typeof newValue === 'string' ? newValue.trim() : newValue;
      setToolInputs(prev => ({ ...prev, [property]: trimmedValue }));
    };
  
    // Helper function for handling input changes (trim on blur, not on every keystroke)
    const handleStringChange = (newValue: string) => {
      setToolInputs(prev => ({ ...prev, [property]: newValue }));
    };
  
    const handleStringBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const trimmedValue = e.target.value.trim();
      if (trimmedValue !== e.target.value) {
        setToolInputs(prev => ({ ...prev, [property]: trimmedValue }));
      }
    };
  
    if (schema.enum) {
      return (
        <select
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={value}
          onChange={(e) => updateValue(e.target.value)}
        >
          <option value="">Select {property}</option>
          {schema.enum.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      );
    }
  
    if (schema.type === 'number') {
      return (
        <input
          type="number"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={value}
          placeholder={schema.description}
          onChange={(e) => updateValue(parseFloat(e.target.value) || 0)}
        />
      );
    }
  
    if (schema.type === 'boolean') {
      return (
        <select
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={value.toString()}
          onChange={(e) => updateValue(e.target.value === 'true')}
        >
          <option value="">Select {property}</option>
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
      );
    }
  
    // For string inputs, use textarea to allow multi-line input and Enter key
    return (
      <div className="space-y-2">
        <textarea
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[2.5rem] resize-y"
          value={value}
          placeholder={schema.description || `Enter ${property}...`}
          onChange={(e) => handleStringChange(e.target.value)}
          onBlur={handleStringBlur}
          rows={1}
          style={{
            resize: 'vertical',
            minHeight: '2.5rem',
            maxHeight: '200px'
          }}
          onInput={(e) => {
            // Auto-resize textarea based on content
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = Math.min(target.scrollHeight, 200) + 'px';
          }}
        />
        
        {/* Show trimming indicator */}
        {typeof value === 'string' && value !== value.trim() && (
          <div className="flex items-center space-x-2 text-xs text-yellow-600">
            <span>⚠️</span>
            <span>Trailing spaces will be trimmed when you finish editing</span>
          </div>
        )}
        
        {/* Show character count for longer inputs */}
        {typeof value === 'string' && value.length > 50 && (
          <div className="text-xs text-gray-500 text-right">
            {value.length} characters
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Bug className="h-8 w-8 text-indigo-600" />
              <h1 className="text-2xl font-bold text-gray-900">MCP Inspector</h1>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-500' :
                  connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                  'bg-red-500'
                }`}></div>
                <span className="text-sm text-gray-600 capitalize">{connectionStatus}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {isConnected && (
                <button
                  onClick={handleDisconnect}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                >
                  <Square className="h-4 w-4" />
                  <span>Disconnect</span>
                </button>
              )}
              <button
                onClick={clearLogs}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                <Trash2 className="h-4 w-4" />
                <span>Clear Logs</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-screen">
        {/* Sidebar Navigation */}
        <nav className="w-64 bg-white shadow-sm border-r">
          <div className="p-4">
            <div className="space-y-2">
              <button
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  activeTab === 'connection' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-100'
                }`}
                onClick={() => setActiveTab('connection')}
              >
                <Settings className="h-4 w-4 inline mr-2" />
                Connection
              </button>
              <button
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  activeTab === 'tools' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-100'
                } ${!isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => isConnected && setActiveTab('tools')}
                disabled={!isConnected}
              >
                <Play className="h-4 w-4 inline mr-2" />
                Tools ({availableTools.length})
              </button>
              <button
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  activeTab === 'resources' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-100'
                } ${!isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => isConnected && setActiveTab('resources')}
                disabled={!isConnected}
              >
                <span className="h-4 w-4 inline-block mr-2">📄</span>
                Resources ({availableResources.length})
              </button>
              <button
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  activeTab === 'prompts' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-100'
                } ${!isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => isConnected && setActiveTab('prompts')}
                disabled={!isConnected}
              >
                <span className="h-4 w-4 inline-block mr-2">💭</span>
                Prompts ({availablePrompts.length})
              </button>
              <button
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  activeTab === 'logs' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-100'
                }`}
                onClick={() => setActiveTab('logs')}
              >
                <span className="h-4 w-4 inline-block mr-2">🔍</span>
                Debug Logs ({logs.length})
              </button>
              <button
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  activeTab === 'raw' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-100'
                }`}
                onClick={() => setActiveTab('raw')}
              >
                <span className="h-4 w-4 inline-block mr-2">📋</span>
                Raw Messages ({rawMessages.length})
              </button>
            </div>

            {/* Server Info */}
            {serverInfo && (
              <div className="mt-6 p-3 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Server Info</h3>
                <div className="text-xs text-gray-600 space-y-1">
                  <div><strong>Name:</strong> {serverInfo.name}</div>
                  <div><strong>Version:</strong> {serverInfo.version}</div>
                  {serverInfo.protocolVersion && (
                    <div><strong>Protocol:</strong> {serverInfo.protocolVersion}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {/* Connection Tab */}
          {activeTab === 'connection' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">MCP Server Connection</h2>
              
              <div className="max-w-2xl space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Connection Type
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={connectionConfig.type}
                    onChange={(e) => setConnectionConfig(prev => ({ ...prev, type: e.target.value }))}
                  >
                    <option value="stdio">Standard I/O (requires bridge)</option>
                    <option value="http">HTTP</option>
                  </select>
                </div>

                {/* Stdio configuration section */}
                {connectionConfig.type === 'stdio' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Command
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={connectionConfig.command}
                        onChange={(e) => setConnectionConfig(prev => ({ ...prev, command: e.target.value.trim() }))}
                        placeholder="uv"
                      />
                      <div className="mt-1 text-xs text-gray-500">
                        The main command to run (e.g., "uv", "python", "node")
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Subcommand
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={connectionConfig.subcommand || ''}
                        onChange={(e) => setConnectionConfig(prev => ({ 
                          ...prev, 
                          subcommand: e.target.value.trim(),
                          args: e.target.value.trim() ? [e.target.value.trim(), prev.filename || ''].filter(Boolean) : [prev.filename || ''].filter(Boolean)
                        }))}
                        placeholder="run"
                      />
                      <div className="mt-1 text-xs text-gray-500">
                        The subcommand (e.g., "run" for uv, leave empty for direct python execution)
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        MCP Server Name
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={connectionConfig.filename || ''}
                        onChange={(e) => setConnectionConfig(prev => ({ 
                          ...prev, 
                          filename: e.target.value.trim(),
                          args: [prev.subcommand || '', e.target.value.trim()].filter(Boolean)
                        }))}
                        placeholder="weather.py"
                      />
                      <div className="mt-1 text-xs text-gray-500">
                        The mcp server file to execute
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Working Directory
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={connectionConfig.workingDir}
                        onChange={(e) => setConnectionConfig(prev => ({ ...prev, workingDir: e.target.value }))}
                        placeholder="/path/to/weather"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Additional Arguments (optional)
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={connectionConfig.extraArgs || ''}
                        onChange={(e) => {
                          const extraArgs = e.target.value.trim() ? e.target.value.trim().split(/\s+/) : [];
                          setConnectionConfig(prev => ({ 
                            ...prev, 
                            extraArgs: e.target.value,
                            args: [prev.subcommand || '', prev.filename || '', ...extraArgs].filter(Boolean)
                          }));
                        }}
                        placeholder="--debug --verbose"
                      />
                      <div className="mt-1 text-xs text-gray-500">
                        Extra command line arguments, separated by spaces
                      </div>
                    </div>

                    {/* Command Preview */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 mb-2">Command Preview</h4>
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm text-blue-700 font-medium">Full Command:</span>
                          <div className="font-mono text-sm text-blue-800 bg-white p-2 rounded border mt-1">
                            {connectionConfig.command} {connectionConfig.args.filter(Boolean).join(' ')}
                          </div>
                        </div>
                        <div>
                          <span className="text-sm text-blue-700 font-medium">Arguments Array:</span>
                          <div className="font-mono text-sm text-blue-800 bg-white p-2 rounded border mt-1">
                            [{connectionConfig.args.filter(Boolean).map(arg => `"${arg}"`).join(', ')}]
                          </div>
                        </div>
                        {connectionConfig.workingDir && (
                          <div>
                            <span className="text-sm text-blue-700 font-medium">Working Directory:</span>
                            <div className="font-mono text-sm text-blue-800 bg-white p-2 rounded border mt-1">
                              {connectionConfig.workingDir}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      HTTP URL
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={connectionConfig.httpUrl}
                      onChange={(e) => setConnectionConfig(prev => ({ ...prev, httpUrl: e.target.value }))}
                      placeholder="http://localhost:8000"
                    />
                  </div>
                )}

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-800 mb-2">Note for stdio connections:</h4>
                  <p className="text-sm text-yellow-700">
                    Browser-based MCP Inspector requires a WebSocket bridge service for stdio connections. 
                    The bridge service should run at ws://localhost:8080/mcp-bridge and handle process spawning.
                  </p>
                </div>

                <button
                  onClick={handleConnect}
                  disabled={isConnected || connectionStatus === 'connecting'}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition-colors flex items-center space-x-2"
                >
                  {connectionStatus === 'connecting' ? (
                    <>
                      <Clock className="h-4 w-4 animate-spin" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      <span>Connect</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Tools Tab - Tool execution and results display */}
          {activeTab === 'tools' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Tools</h2>
              
              {/* Debug info */}
              <div className="mb-4 text-sm text-gray-600">
                Debug: {availableTools.length} tools loaded
                {availableTools.length > 0 && ` (${availableTools.map(t => t.name).join(', ')})`}
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tool Selection */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Available Tools</h3>
                  <div className="space-y-2">
                    {availableTools.map((tool) => (
                      <div
                        key={tool.name}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedTool?.name === tool.name ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => {
                          setSelectedTool(tool);
                          setToolInputs({});
                        }}
                      >
                        <h4 className="font-medium text-gray-900">{tool.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{tool.description}</p>
                        
                        {/* Show required parameters */}
                        {tool.inputSchema.required && tool.inputSchema.required.length > 0 && (
                          <div className="mt-2">
                            <span className="text-xs text-gray-500">
                              Required: {tool.inputSchema.required.join(', ')}
                            </span>
                          </div>
                        )}
                        
                        {/* Show parameter count */}
                        <div className="mt-2 text-xs text-gray-500">
                          Parameters: {Object.keys(tool.inputSchema.properties || {}).length}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* No Tools Message */}
                  {availableTools.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <span className="text-4xl mb-2 block">🔧</span>
                      <p>No tools available</p>
                      <p className="text-sm">Connect to an MCP server that provides tools</p>
                    </div>
                  )}
                </div>

                {/* Tool Execution */}
                {selectedTool && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Execute Tool: {selectedTool.name}</h3>
                    
                    {/* Tool Description */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 mb-2">Description</h4>
                      <p className="text-blue-800 text-sm">{selectedTool.description}</p>
                    </div>
                    
                    {/* Input Parameters */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">Parameters</h4>
                      {Object.entries(selectedTool.inputSchema.properties || {}).map(([property, schema]) => (
                        <div key={property}>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {property}
                            {selectedTool.inputSchema.required?.includes(property) && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                            {schema.default !== undefined && (
                              <span className="text-gray-500 text-xs ml-2">
                                (default: {schema.default})
                              </span>
                            )}
                          </label>
                          {renderToolInput(property, schema)}
                          {schema.description && (
                            <p className="text-xs text-gray-500 mt-1">{schema.description}</p>
                          )}
                        </div>
                      ))}
                      
                      {Object.keys(selectedTool.inputSchema.properties || {}).length === 0 && (
                        <p className="text-gray-500 text-sm">This tool requires no parameters</p>
                      )}
                    </div>

                    {/* Execution Button */}
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={handleExecuteTool}
                        disabled={isExecutingTool}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition-colors flex items-center space-x-2"
                      >
                        {isExecutingTool ? (
                          <>
                            <Clock className="h-4 w-4 animate-spin" />
                            <span>Executing...</span>
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4" />
                            <span>Execute Tool</span>
                          </>
                        )}
                      </button>
                      
                      {/* Clear inputs button */}
                      <button
                        onClick={() => setToolInputs({})}
                        className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                    
                    {/* Current Input Preview */}
                    {Object.keys(toolInputs).length > 0 && (
                      <div className="bg-gray-50 border rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2">Current Input</h4>
                        <pre className="text-sm text-gray-800 bg-white p-3 rounded border overflow-x-auto">
                          {JSON.stringify(toolInputs, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Tool Results Section */}
              {toolResults.length > 0 && (
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Execution Results</h3>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">{toolResults.length} results</span>
                      <button
                        onClick={() => setToolResults([])}
                        className="text-gray-500 hover:text-gray-700 text-sm"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {toolResults.map((result) => (
                      <div key={result.id} className={`border rounded-lg overflow-hidden ${
                        result.status === 'success' ? 'border-green-200' : 'border-red-200'
                      }`}>
                        {/* Result Header */}
                        <div className={`px-4 py-3 ${
                          result.status === 'success' ? 'bg-green-50' : 'bg-red-50'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              {result.status === 'success' ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              ) : (
                                <XCircle className="h-5 w-5 text-red-500" />
                              )}
                              <div>
                                <span className="font-medium text-gray-900">{result.toolName}</span>
                                <span className="text-sm text-gray-500 ml-2">
                                  {result.duration.toFixed(2)}ms
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => copyToClipboard(JSON.stringify(result, null, 2))}
                                className="text-gray-500 hover:text-gray-700"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                              <span className="text-xs text-gray-500">
                                {new Date(result.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="p-4 space-y-4">
                          {/* Input Parameters */}
                          <div>
                            <h5 className="font-medium text-gray-900 mb-2">Input Parameters</h5>
                            <pre className="text-sm text-gray-800 bg-gray-50 p-3 rounded border overflow-x-auto">
                              {JSON.stringify(result.inputs, null, 2)}
                            </pre>
                          </div>
                          
                          {/* Result or Error */}
                          {result.status === 'success' && result.result && (
                            <div>
                              <h5 className="font-medium text-gray-900 mb-2">Result</h5>
                              <div className="text-sm text-gray-800 bg-green-50 p-3 rounded border overflow-x-auto max-w-full">
                                <pre className="whitespace-pre-wrap break-words">
                                  {JSON.stringify(result.result, null, 2).replace(/\\n/g, '\n')}
                                </pre>
                              </div>
                            </div>
                          )}
                          
                          {result.status === 'error' && result.error && (
                            <div>
                              <h5 className="font-medium text-red-900 mb-2">Error</h5>
                              <div className="text-sm bg-red-50 p-3 rounded border">
                                <p className="text-red-800 font-medium">{result.error}</p>
                              </div>
                            </div>
                          )}
                          
                          {/* Execution Statistics */}
                          <div className="bg-gray-50 p-3 rounded border">
                            <h5 className="font-medium text-gray-900 mb-2">Execution Info</h5>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Status:</span>
                                <p className={`font-medium ${
                                  result.status === 'success' ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {result.status}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-500">Duration:</span>
                                <p className="font-medium">{result.duration.toFixed(2)}ms</p>
                              </div>
                              <div>
                                <span className="text-gray-500">Timestamp:</span>
                                <p className="font-medium">
                                  {new Date(result.timestamp).toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-500">Tool:</span>
                                <p className="font-medium">{result.toolName}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* No Selected Tool Message */}
              {!selectedTool && availableTools.length > 0 && (
                <div className="text-center py-12 text-gray-500 mt-8">
                  <span className="text-4xl mb-4 block">🔧</span>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Tool</h3>
                  <p>Choose a tool from the list to configure and execute it</p>
                </div>
              )}
            </div>
          )}

          {/* Resources Tab */}
          {activeTab === 'resources' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Resources</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Resources List */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Available Resources</h3>
                  <div className="space-y-2">
                    {availableResources.map((resource) => (
                      <div
                        key={resource.uri}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedResource?.uri === resource.uri ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => {
                          setSelectedResource(resource);
                          setResourceContent(null);
                          handleResourceRead(resource);
                        }}
                      >
                        <h4 className="font-medium text-gray-900">{resource.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{resource.description}</p>
                        <p className="text-xs text-gray-500 mt-1">{resource.uri}</p>
                        <span className="inline-block mt-2 px-2 py-1 bg-gray-100 text-xs rounded">
                          {resource.mimeType}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  {/* No Resources Message */}
                  {availableResources.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <span className="text-4xl mb-2 block">📄</span>
                      <p>No resources available</p>
                      <p className="text-sm">Connect to an MCP server that provides resources</p>
                    </div>
                  )}
                </div>

                {/* Resource Content */}
                {selectedResource && !resourceContent && (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading resource content...</p>
                    </div>
                  </div>
                )}
                
                {resourceContent && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900">Resource Content</h3>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => copyToClipboard(resourceContent.text || resourceContent.blob)}
                          className="text-gray-500 hover:text-gray-700 flex items-center space-x-1"
                        >
                          <Copy className="h-4 w-4" />
                          <span className="text-sm">Copy</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedResource(null);
                            setResourceContent(null);
                          }}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="border rounded-lg">
                      <div className="bg-gray-50 px-4 py-2 border-b text-sm text-gray-600 flex items-center justify-between">
                        <div>
                          <span className="font-medium">{selectedResource?.name}</span>
                          <span className="ml-2 text-gray-400">•</span>
                          <span className="ml-2">{resourceContent.mimeType}</span>
                        </div>
                        <span className="text-xs">
                          {resourceContent.text ? `${resourceContent.text.length} chars` : 'Binary content'}
                        </span>
                      </div>
                      
                      {/* Content Display */}
                      <div className="p-4">
                        {resourceContent.text ? (
                          <pre className="text-sm text-gray-800 overflow-x-auto max-h-96 bg-gray-50 p-3 rounded border whitespace-pre-wrap">
                            {resourceContent.text}
                          </pre>
                        ) : resourceContent.blob ? (
                          /* Binary Content */
                          <div className="text-center py-8 text-gray-500">
                            <span className="text-4xl mb-2 block">📦</span>
                            <p>Binary content cannot be displayed</p>
                            <p className="text-sm">Size: {resourceContent.blob.length} bytes (base64)</p>
                            <button
                              onClick={() => copyToClipboard(resourceContent.blob)}
                              className="mt-2 bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded text-sm"
                            >
                              Copy Base64
                            </button>
                          </div>
                        ) : (
                          /* No Content */
                          <div className="text-center py-8 text-gray-500">
                            <span className="text-4xl mb-2 block">❓</span>
                            <p>No content available</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {!selectedResource && (
                  <div className="text-center py-12 text-gray-500">
                    <span className="text-4xl mb-4 block">📄</span>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Resource</h3>
                    <p>Choose a resource from the list to view its content</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Debug Logs Tab */}
          {activeTab === 'logs' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Debug Logs</h2>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">{logs.length} entries</span>
                </div>
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto bg-white border rounded-lg p-4">
                {logs.map((log) => {
                  const isExpanded = expandedLogs.has(log.id);
                  return (
                    <div
                      key={log.id}
                      className={`border rounded p-3 cursor-pointer transition-colors ${
                        log.level === 'error' ? 'border-red-200 bg-red-50' :
                        log.level === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                        log.level === 'success' ? 'border-green-200 bg-green-50' :
                        'border-gray-200 bg-gray-50'
                      }`}
                      onClick={() => toggleLogExpansion(log.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-500" />
                          )}
                          <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${
                            log.level === 'error' ? 'bg-red-200 text-red-800' :
                            log.level === 'warning' ? 'bg-yellow-200 text-yellow-800' :
                            log.level === 'success' ? 'bg-green-200 text-green-800' :
                            'bg-blue-200 text-blue-800'
                          }`}>
                            {log.level}
                          </span>
                          <span className="text-gray-800">{log.message}</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      
                      {isExpanded && log.details && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <pre className="text-xs text-gray-600 overflow-x-auto">
                            {typeof log.details === 'string' ? log.details : JSON.stringify(log.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {logs.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    No debug logs yet. Connect to an MCP server and perform actions to see logs here.
                  </div>
                )}
                <div ref={logsEndRef} />
              </div>
            </div>
          )}

          {/* Raw Messages Tab */}
          {activeTab === 'raw' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Raw JSON-RPC Messages</h2>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">{rawMessages.length} messages</span>
                </div>
              </div>
              
              <div className="space-y-4 max-h-96 overflow-y-auto bg-white border rounded-lg p-4">
                {rawMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`border rounded p-4 ${
                      message.direction === 'sent' ? 'border-blue-200 bg-blue-50' : 'border-green-200 bg-green-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          message.direction === 'sent' ? 'bg-blue-200 text-blue-800' : 'bg-green-200 text-green-800'
                        }`}>
                          {message.direction === 'sent' ? '→ SENT' : '← RECEIVED'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => copyToClipboard(message.message)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <span className="text-xs text-gray-500">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                    <pre className="text-sm text-gray-800 overflow-x-auto bg-white p-3 rounded border">
                      {message.message}
                    </pre>
                  </div>
                ))}
                
                {rawMessages.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    No raw messages yet. Connect to an MCP server and perform actions to see JSON-RPC messages here.
                  </div>
                )}
                <div ref={logsEndRef} />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default MCPInspector;