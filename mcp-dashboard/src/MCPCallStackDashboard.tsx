'use client';

import React, { useState } from 'react';
import { Input } from './components/ui/input';
import { Card, CardContent } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { ScrollArea } from './components/ui/scroll-area';
import { Cpu, Timer, ChevronDown } from 'lucide-react';

// Mock data for MCP call stacks
const mcpData = [
  {
    name: 'mcp-user-auth',
    stack: ['validateToken()', 'fetchUser()', 'authorize()'],
    executionTimeMs: 312,
    status: 'healthy',
  },
  {
    name: 'mcp-order-service',
    stack: ['checkInventory()', 'createOrder()', 'notifyUser()'],
    executionTimeMs: 542,
    status: 'degraded',
  },
  {
    name: 'mcp-payment-gateway',
    stack: ['initTransaction()', 'processCard()', 'confirmPayment()'],
    executionTimeMs: 982,
    status: 'error',
  },
];

export default function McpCallStackDashboard() {
  const [search, setSearch] = useState('');
  // Track which MCP items are expanded; store their names in a Set for quick toggling
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filteredData = mcpData.filter((mcp) =>
    mcp.name.toLowerCase().includes(search.toLowerCase())
  );

  // Toggle expanded state for an MCP item
  function toggleExpand(name: string) {
    setExpanded((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(name)) {
        newSet.delete(name);
      } else {
        newSet.add(name);
      }
      return newSet;
    });
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-b from-slate-100 to-slate-300 p-8">
      <div className="w-full max-w-4xl flex flex-col items-center mb-10">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
          MCP Call Stack Dashboard
        </h1>

        <Input
          placeholder="Search MCPs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm shadow-md rounded-md"
        />
      </div>

      <ScrollArea className="w-full max-w-6xl h-[650px] rounded-xl border border-gray-300 shadow-lg bg-white p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredData.map((mcp) => {
            const isExpanded = expanded.has(mcp.name);

            return (
              <Card
                key={mcp.name}
                className="shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer"
                onClick={() => toggleExpand(mcp.name)}
              >
                <CardContent className="p-6 space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">{mcp.name}</h2>
                    <div className="flex items-center gap-4">
                      <Badge
                        className={`${
                          mcp.status === 'healthy'
                            ? 'bg-green-500'
                            : mcp.status === 'degraded'
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        } text-white uppercase px-3 py-1 rounded-full text-sm font-bold`}
                      >
                        {mcp.status}
                      </Badge>

                      <ChevronDown
                        className={`w-5 h-5 text-gray-600 transition-transform duration-300 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </div>

                  {/* Collapsible stack trace */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-500 font-semibold">
                      <Cpu className="w-5 h-5" />
                      Stack Trace:
                    </div>

                    <ul
                      className={`text-sm list-disc list-inside text-gray-600 overflow-hidden transition-[max-height] duration-500 ease-in-out ${
                        isExpanded ? 'max-h-96' : 'max-h-0'
                      }`}
                      style={{ willChange: 'max-height' }}
                    >
                      {mcp.stack.map((func, i) => (
                        <li key={i}>{func}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-500 font-semibold">
                    <Timer className="w-5 h-5" />
                    Execution Time:{' '}
                    <span className="font-normal">{mcp.executionTimeMs} ms</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
