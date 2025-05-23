// components/ToolsTab.tsx

import React from 'react';
import { Play, Clock, CheckCircle, XCircle, Copy } from 'lucide-react';
import { Tool, ToolResult } from '../../types';
import { useToolInput } from '../../hooks/useToolInput';
import { copyToClipboard, formatDuration } from '../../utils';

interface ToolsTabProps {
  availableTools: Tool[];
  selectedTool: Tool | null;
  setSelectedTool: (tool: Tool | null) => void;
  toolInputs: Record<string, any>;
  setToolInputs: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  toolResults: ToolResult[];
  setToolResults: React.Dispatch<React.SetStateAction<ToolResult[]>>;
  isExecutingTool: boolean;
  onExecuteTool: () => void;
}

export const ToolsTab: React.FC<ToolsTabProps> = ({
  availableTools,
  selectedTool,
  setSelectedTool,
  toolInputs,
  setToolInputs,
  toolResults,
  setToolResults,
  isExecutingTool,
  onExecuteTool
}) => {
  const { renderToolInput } = useToolInput({ toolInputs, setToolInputs });

  return (
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
                onClick={onExecuteTool}
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
                          {formatDuration(result.duration)}
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
                        <p className="font-medium">{formatDuration(result.duration)}</p>
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
  );
};