import React from 'react';
import { Settings, Play } from 'lucide-react';
import { ServerInfo } from '../../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isConnected: boolean;
  availableTools: any[];
  availableResources: any[];
  availablePrompts: any[];
  logs: any[];
  rawMessages: any[];
  serverInfo: ServerInfo | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isConnected,
  availableTools,
  availableResources,
  availablePrompts,
  logs,
  rawMessages,
  serverInfo
}) => {
  const navItems = [
    { id: 'connection', label: 'Connection', icon: Settings, disabled: false },
    { id: 'tools', label: `Tools (${availableTools.length})`, icon: Play, disabled: !isConnected },
    { id: 'resources', label: `Resources (${availableResources.length})`, icon: '📄', disabled: !isConnected },
    { id: 'prompts', label: `Prompts (${availablePrompts.length})`, icon: '💭', disabled: !isConnected },
    { id: 'logs', label: `Debug Logs (${logs.length})`, icon: '🔍', disabled: false },
    { id: 'raw', label: `Raw Messages (${rawMessages.length})`, icon: '📋', disabled: false },
  ];

  return (
    <nav className="w-64 bg-white shadow-sm border-r">
      <div className="p-4">
        <div className="space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                activeTab === item.id ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-100'
              } ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => !item.disabled && setActiveTab(item.id)}
              disabled={item.disabled}
            >
              {typeof item.icon === 'string' ? (
                <span className="h-4 w-4 inline-block mr-2">{item.icon}</span>
              ) : (
                <item.icon className="h-4 w-4 inline mr-2" />
              )}
              {item.label}
            </button>
          ))}
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
  );
};