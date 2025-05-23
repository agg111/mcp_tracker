import React, { useState, useEffect, useRef } from 'react';
import { MCPClient } from '../lib/MCPClient';
import { Header } from './layout/Header';
import { Sidebar } from './layout/Sidebar';
import { ConnectionTab } from './features/ConnectionTab';
import { ToolsTab } from './features/ToolsTab';
import { ResourcesTab } from './features/ResourcesTab';
import { LogsTab } from './features/LogsTab';
import { RawMessagesTab } from './features/RawMessagesTab';
import {
  Tool,
  Resource,
  ServerInfo,
  ToolResult,
  ConnectionConfig,
  LogEntry,
  RawMessage,
  LogLevel,
  LogDetails
} from '../types';
import {
  scrollToBottom,
  createLogEntry,
  createRawMessage,
  filterEmptyArgs
} from '../utils';

const MCPDashboard = () => {
  const [activeTab, setActiveTab] = useState('connection');
  const [connectionConfig, setConnectionConfig] = useState<ConnectionConfig>({
    type: 'stdio',
    command: '',
    subcommand: '',
    filename: '',
    extraArgs: '',
    args: ['', ''],
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
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [rawMessages, setRawMessages] = useState<RawMessage[]>([]);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollToBottom(logsEndRef);
  }, [logs, rawMessages]);

  const addLog = (level: LogLevel, message: string, details: LogDetails = null) => {
    const newLog = createLogEntry(level, message, details);
    setLogs(prev => [...prev, newLog]);
  };

  const addRawMessage = (direction: 'sent' | 'received', message: Record<string, any>) => {
    const newMessage = createRawMessage(direction, message);
    setRawMessages(prev => [...prev, newMessage]);
  };

  const handleConnect = async () => {
    setConnectionStatus('connecting');
    addLog('info', 'Attempting to connect to MCP server', connectionConfig);
    
    try {
      const client = new MCPClient(addRawMessage, addLog);
      
      let initResult;
      if (connectionConfig.type === 'stdio') {
        const cleanArgs = filterEmptyArgs(connectionConfig.args);
        
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
      
      await loadServerCapabilities(client, initResult.capabilities || {});
      
      addLog('success', 'Successfully connected to MCP server');
    } catch (error) {
      setConnectionStatus('disconnected');
      addLog('error', 'Failed to connect to MCP server', error as LogDetails);
    }
  };

  const loadServerCapabilities = async (client: MCPClient, serverCapabilities: Record<string, any>) => {
    try {
      if (serverCapabilities?.tools !== undefined) {
        addLog('info', 'Loading available tools...');
        const tools = await client.listTools();
        setAvailableTools(tools);
        addLog('success', `Loaded ${tools.length} tools: ${tools.map(t => t.name).join(', ')}`);
      } else {
        addLog('info', 'Server does not support tools');
      }
      
      if (serverCapabilities?.resources !== undefined) {
        addLog('info', 'Loading available resources...');
        const resources = await client.listResources();
        setAvailableResources(resources);
        addLog('success', `Loaded ${resources.length} resources`);
      } else {
        addLog('info', 'Server does not support resources');
      }
      
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

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'connection':
        return (
          <ConnectionTab
            connectionConfig={connectionConfig}
            setConnectionConfig={setConnectionConfig}
            connectionStatus={connectionStatus}
            isConnected={isConnected}
            onConnect={handleConnect}
          />
        );
      case 'tools':
        return (
          <ToolsTab
            availableTools={availableTools}
            selectedTool={selectedTool}
            setSelectedTool={setSelectedTool}
            toolInputs={toolInputs}
            setToolInputs={setToolInputs}
            toolResults={toolResults}
            setToolResults={setToolResults}
            isExecutingTool={isExecutingTool}
            onExecuteTool={handleExecuteTool}
          />
        );
      case 'resources':
        return (
          <ResourcesTab
            availableResources={availableResources}
            selectedResource={selectedResource}
            setSelectedResource={setSelectedResource}
            resourceContent={resourceContent}
            setResourceContent={setResourceContent}
            onResourceRead={handleResourceRead}
          />
        );
      case 'logs':
        return (
          <LogsTab
            logs={logs}
            expandedLogs={expandedLogs}
            onToggleLogExpansion={toggleLogExpansion}
            logsEndRef={logsEndRef}
          />
        );
      case 'raw':
        return (
          <RawMessagesTab
            rawMessages={rawMessages}
            logsEndRef={logsEndRef}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        connectionStatus={connectionStatus}
        isConnected={isConnected}
        onDisconnect={handleDisconnect}
        onClearLogs={clearLogs}
      />

      <div className="flex h-screen">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isConnected={isConnected}
          availableTools={availableTools}
          availableResources={availableResources}
          availablePrompts={availablePrompts}
          logs={logs}
          rawMessages={rawMessages}
          serverInfo={serverInfo}
        />

        <main className="flex-1 overflow-auto">
          {renderActiveTab()}
        </main>
      </div>
    </div>
  );
};

export default MCPDashboard;