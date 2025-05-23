export interface Tool {
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
  
export interface Resource {
    uri: string;
    name: string;
    description: string;
    mimeType: string;
    size?: number;
    lastModified?: number;
}
  
export interface ServerInfo {
    name: string;
    version: string;
    protocolVersion?: string;
}
  
export interface ToolResult {
    id: number;
    toolName: string;
    inputs: Record<string, any>;
    timestamp: string;
    status: 'success' | 'error';
    duration: number;
    result: any;
    error: string | null;
}
  
export type LogLevel = 'info' | 'success' | 'error' | 'warning';
export type LogDetails = Record<string, any> | null;
  
export interface PromptArgument {
    name: string;
    description: string;
    type: string;
    required: boolean;
}
  
export interface MessageContent {
    type: string;
    text: string;
}
  
export interface Message {
    role: string;
    content: MessageContent[];
}
  
export interface ConnectionConfig {
    type: string;
    command: string;
    subcommand: string;
    filename: string;
    extraArgs: string;
    args: string[];
    workingDir: string;
    httpUrl: string;
}
  
export interface LogEntry {
    id: number;
    timestamp: string;
    level: LogLevel;
    message: string;
    details: LogDetails;
}
  
export interface RawMessage {
    id: number;
    timestamp: string;
    direction: 'sent' | 'received';
    message: string;
}