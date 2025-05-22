import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Trash2, Settings, Bug, Clock, CheckCircle, XCircle, ChevronDown, ChevronRight, Copy } from 'lucide-react';

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
}

interface ServerInfo {
  name: string;
  version: string;
  protocolVersion: string;
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

const MCPInspector = () => {
  const [activeTab, setActiveTab] = useState('connection');
  const [connectionConfig, setConnectionConfig] = useState({
    type: 'stdio',
    command: '',
    args: [] as string[],
    workingDir: '',
    env: {}
  });
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [capabilities, setCapabilities] = useState<Record<string, any> | null>(null);
  
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
  const [notifications, setNotifications] = useState<any[]>([]);
  const [rawMessages, setRawMessages] = useState<any[]>([]);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  // Scroll to bottom of logs
  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs, rawMessages]);

  // Mock data for demonstration - in a real implementation, this would connect to actual MCP servers
  useEffect(() => {
    // Simulate some initial mock data
    setAvailableTools([
      {
        name: 'get_weather',
        description: 'Get current weather for a city',
        inputSchema: {
          type: 'object',
          properties: {
            city: { type: 'string', description: 'City name' },
            units: { type: 'string', enum: ['celsius', 'fahrenheit'], default: 'celsius' }
          },
          required: ['city']
        }
      },
      {
        name: 'read_file',
        description: 'Read contents of a file',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path' },
            encoding: { type: 'string', default: 'utf-8' }
          },
          required: ['path']
        }
      },
      {
        name: 'search_web',
        description: 'Search the web for information',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            max_results: { type: 'number', default: 5 }
          },
          required: ['query']
        }
      }
    ]);

    setAvailableResources([
      {
        uri: 'file:///home/user/documents/readme.md',
        name: 'README.md',
        description: 'Project documentation',
        mimeType: 'text/markdown'
      },
      {
        uri: 'db://localhost/users',
        name: 'Users Database',
        description: 'User management database',
        mimeType: 'application/json'
      }
    ]);

    setAvailablePrompts([
      {
        name: 'code_review',
        description: 'Generate a code review',
        arguments: [
          { name: 'language', description: 'Programming language', type: 'string', required: true },
          { name: 'code', description: 'Code to review', type: 'string', required: true }
        ]
      },
      {
        name: 'summarize_text',
        description: 'Summarize a piece of text',
        arguments: [
          { name: 'text', description: 'Text to summarize', type: 'string', required: true },
          { name: 'max_length', description: 'Maximum summary length', type: 'number', required: false }
        ]
      }
    ]);
  }, []);

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
      direction, // 'sent' or 'received'
      message: JSON.stringify(message, null, 2)
    };
    setRawMessages(prev => [...prev, newMessage]);
  };

  const handleConnect = async () => {
    setConnectionStatus('connecting');
    addLog('info', 'Attempting to connect to MCP server', connectionConfig);
    
    // Simulate connection process
    setTimeout(() => {
      setIsConnected(true);
      setConnectionStatus('connected');
      setServerInfo({
        name: 'Mock MCP Server',
        version: '1.0.0',
        protocolVersion: '2025-03-26'
      });
      setCapabilities({
        tools: { listChanged: true },
        resources: { subscribe: true },
        prompts: { listChanged: true },
        logging: true
      });
      addLog('success', 'Successfully connected to MCP server');
      addRawMessage('received', {
        jsonrpc: '2.0',
        id: 1,
        result: {
          protocolVersion: '2025-03-26',
          serverInfo: { name: 'Mock MCP Server', version: '1.0.0' },
          capabilities: { tools: {}, resources: {}, prompts: {} }
        }
      });
    }, 2000);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setConnectionStatus('disconnected');
    setServerInfo(null);
    setCapabilities(null);
    addLog('info', 'Disconnected from MCP server');
  };

  const handleExecuteTool = async () => {
    if (!selectedTool) return;
    
    setIsExecutingTool(true);
    addLog('info', `Executing tool: ${selectedTool.name}`, toolInputs);
    addRawMessage('sent', {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: selectedTool.name,
        arguments: toolInputs
      }
    });

    // Simulate tool execution
    setTimeout(() => {
      const mockResult: ToolResult = {
        id: Date.now(),
        toolName: selectedTool.name,
        inputs: { ...toolInputs },
        timestamp: new Date().toISOString(),
        status: Math.random() > 0.1 ? 'success' : 'error',
        duration: Math.random() * 1000 + 100,
        result: null,
        error: null
      };

      if (mockResult.status === 'success') {
        // Generate mock successful results based on tool type
        if (selectedTool.name === 'get_weather') {
          mockResult.result = {
            temperature: Math.floor(Math.random() * 40) + 10,
            condition: ['sunny', 'cloudy', 'rainy'][Math.floor(Math.random() * 3)],
            humidity: Math.floor(Math.random() * 100),
            city: toolInputs.city
          };
        } else if (selectedTool.name === 'read_file') {
          mockResult.result = {
            content: `File content for ${toolInputs.path}\n\nThis is mock file content...`,
            size: 1024,
            lastModified: new Date().toISOString()
          };
        } else {
          mockResult.result = { success: true, data: 'Mock result data' };
        }
        addLog('success', `Tool executed successfully: ${selectedTool.name}`);
      } else {
        mockResult.error = 'Simulated error: Connection timeout';
        addLog('error', `Tool execution failed: ${selectedTool.name}`, { error: mockResult.error });
      }

      addRawMessage('received', {
        jsonrpc: '2.0',
        id: Date.now(),
        result: {
          content: [{ type: 'text', text: JSON.stringify(mockResult.result || mockResult.error) }],
          isError: mockResult.status === 'error'
        }
      });

      setToolResults(prev => [mockResult, ...prev]);
      setIsExecutingTool(false);
    }, Math.random() * 2000 + 1000);
  };

  const handleResourceRead = async (resource: Resource) => {
    addLog('info', `Reading resource: ${resource.name}`);
    addRawMessage('sent', {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'resources/read',
      params: { uris: [resource.uri] }
    });

    // Simulate resource reading
    setTimeout(() => {
      const mockContent = {
        uri: resource.uri,
        mimeType: resource.mimeType,
        text: resource.mimeType.includes('json') ? 
          JSON.stringify({ users: [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }] }, null, 2) :
          `# ${resource.name}\n\nThis is mock content for ${resource.name}.\n\nLorem ipsum dolor sit amet...`
      };
      
      setResourceContent(mockContent);
      addLog('success', `Resource read successfully: ${resource.name}`);
      addRawMessage('received', {
        jsonrpc: '2.0',
        id: Date.now(),
        result: {
          contents: [mockContent]
        }
      });
    }, 500);
  };

  const handlePromptGet = async () => {
    if (!selectedPrompt) return;
    
    addLog('info', `Getting prompt: ${selectedPrompt.name}`, promptInputs);
    addRawMessage('sent', {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'prompts/get',
      params: {
        name: selectedPrompt.name,
        arguments: promptInputs
      }
    });

    // Simulate prompt generation
    setTimeout(() => {
      const mockPromptResult = {
        description: `Generated prompt for ${selectedPrompt.name}`,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Please ${selectedPrompt.description.toLowerCase()} the following: ${JSON.stringify(promptInputs)}`
              }
            ]
          }
        ]
      };

      setPromptResult(mockPromptResult);
      addLog('success', `Prompt generated successfully: ${selectedPrompt.name}`);
      addRawMessage('received', {
        jsonrpc: '2.0',
        id: Date.now(),
        result: mockPromptResult
      });
    }, 800);
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
    
    if (schema.enum) {
      return (
        <select
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={value}
          onChange={(e) => setToolInputs(prev => ({ ...prev, [property]: e.target.value }))}
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
          onChange={(e) => setToolInputs(prev => ({ ...prev, [property]: parseFloat(e.target.value) || 0 }))}
        />
      );
    }

    return (
      <input
        type="text"
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={value}
        placeholder={schema.description}
        onChange={(e) => setToolInputs(prev => ({ ...prev, [property]: e.target.value }))}
      />
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
                  <div><strong>Protocol:</strong> {serverInfo.protocolVersion}</div>
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
                    <option value="stdio">Standard I/O</option>
                    <option value="http">HTTP</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Command
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={connectionConfig.command}
                    onChange={(e) => setConnectionConfig(prev => ({ ...prev, command: e.target.value }))}
                    placeholder="python server.py"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Arguments (one per line)
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    value={connectionConfig.args.join('\n')}
                    onChange={(e) => setConnectionConfig(prev => ({ 
                      ...prev, 
                      args: e.target.value.split('\n').filter(arg => arg.trim()) 
                    }))}
                    placeholder="--verbose&#10;--config config.json"
                  />
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
                    placeholder="/path/to/mcp/server"
                  />
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

          {/* Tools Tab */}
          {activeTab === 'tools' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Tools</h2>
              
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
                        }}
                      >
                        <h4 className="font-medium text-gray-900">{tool.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{tool.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Resource Content */}
                {resourceContent && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900">Resource Content</h3>
                      <button
                        onClick={() => copyToClipboard(resourceContent.text)}
                        className="text-gray-500 hover:text-gray-700 flex items-center space-x-1"
                      >
                        <Copy className="h-4 w-4" />
                        <span className="text-sm">Copy</span>
                      </button>
                    </div>
                    <div className="border rounded-lg p-4 bg-white">
                      <div className="mb-3 text-sm text-gray-600">
                        <strong>URI:</strong> {resourceContent.uri}<br/>
                        <strong>Type:</strong> {resourceContent.mimeType}
                      </div>
                      <pre className="text-sm overflow-x-auto bg-gray-50 p-3 rounded">
                        {resourceContent.text}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Prompts Tab */}
          {activeTab === 'prompts' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Prompts</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Prompt Selection */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Available Prompts</h3>
                  <div className="space-y-2">
                    {availablePrompts.map((prompt) => (
                      <div
                        key={prompt.name}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedPrompt?.name === prompt.name ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => {
                          setSelectedPrompt(prompt);
                          setPromptInputs({});
                        }}
                      >
                        <h4 className="font-medium text-gray-900">{prompt.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{prompt.description}</p>
                        <div className="text-xs text-gray-500 mt-2">
                          Arguments: {prompt.arguments.map((arg: PromptArgument) => arg.name).join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Prompt Configuration */}
                {selectedPrompt && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Configure Prompt: {selectedPrompt.name}</h3>
                    
                    {/* Input Parameters */}
                    <div className="space-y-4">
                      {selectedPrompt.arguments.map((arg: PromptArgument) => (
                        <div key={arg.name}>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {arg.name}
                            {arg.required && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                          </label>
                          {arg.type === 'number' ? (
                            <input
                              type="number"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={promptInputs[arg.name] || ''}
                              placeholder={arg.description}
                              onChange={(e) => setPromptInputs(prev => ({ 
                                ...prev, 
                                [arg.name]: parseFloat(e.target.value) || 0 
                              }))}
                            />
                          ) : (
                            <textarea
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              rows={3}
                              value={promptInputs[arg.name] || ''}
                              placeholder={arg.description}
                              onChange={(e) => setPromptInputs(prev => ({ 
                                ...prev, 
                                [arg.name]: e.target.value 
                              }))}
                            />
                          )}
                          <p className="text-xs text-gray-500 mt-1">{arg.description}</p>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={handlePromptGet}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors flex items-center space-x-2"
                    >
                      <span>💭</span>
                      <span>Generate Prompt</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Prompt Results */}
              {promptResult && (
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Generated Prompt</h3>
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(promptResult, null, 2))}
                      className="text-gray-500 hover:text-gray-700 flex items-center space-x-1"
                    >
                      <Copy className="h-4 w-4" />
                      <span className="text-sm">Copy</span>
                    </button>
                  </div>
                  <div className="border rounded-lg p-4 bg-white">
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                      <p className="text-gray-700">{promptResult.description}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Messages</h4>
                      <div className="space-y-3">
                        {promptResult.messages.map((message: Message, index: number) => (
                          <div key={index} className="border rounded p-3 bg-gray-50">
                            <div className="font-medium text-sm text-gray-600 mb-2">
                              Role: {message.role}
                            </div>
                            {message.content.map((content: MessageContent, contentIndex: number) => (
                              <div key={contentIndex}>
                                {content.type === 'text' && (
                                  <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                                    {content.text}
                                  </pre>
                                )}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
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