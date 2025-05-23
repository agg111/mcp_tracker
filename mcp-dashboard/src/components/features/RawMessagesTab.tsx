import React from 'react';
import { Copy } from 'lucide-react';
import { RawMessage } from '../../types';
import { copyToClipboard, formatTimestamp } from '../../utils';

interface RawMessagesTabProps {
  rawMessages: RawMessage[];
  logsEndRef: React.RefObject<HTMLDivElement | null>;
}

export const RawMessagesTab: React.FC<RawMessagesTabProps> = ({
  rawMessages,
  logsEndRef
}) => {
  return (
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
                  {formatTimestamp(message.timestamp)}
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
  );
};