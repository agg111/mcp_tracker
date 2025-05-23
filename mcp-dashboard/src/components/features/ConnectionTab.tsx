import React from 'react';
import { Play, Clock } from 'lucide-react';
import { ConnectionConfig } from '../../types';

interface ConnectionTabProps {
  connectionConfig: ConnectionConfig;
  setConnectionConfig: React.Dispatch<React.SetStateAction<ConnectionConfig>>;
  connectionStatus: string;
  isConnected: boolean;
  onConnect: () => void;
}

export const ConnectionTab: React.FC<ConnectionTabProps> = ({
  connectionConfig,
  setConnectionConfig,
  connectionStatus,
  isConnected,
  onConnect
}) => {
  return (
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
                The MCP server file to execute
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
          onClick={onConnect}
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
  );
};