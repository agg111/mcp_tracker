import React from 'react';
import { Bug, Square, Trash2 } from 'lucide-react';

interface HeaderProps {
  connectionStatus: string;
  isConnected: boolean;
  onDisconnect: () => void;
  onClearLogs: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  connectionStatus,
  isConnected,
  onDisconnect,
  onClearLogs
}) => {
  return (
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
                onClick={onDisconnect}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                <Square className="h-4 w-4" />
                <span>Disconnect</span>
              </button>
            )}
            <button
              onClick={onClearLogs}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <Trash2 className="h-4 w-4" />
              <span>Clear Logs</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};