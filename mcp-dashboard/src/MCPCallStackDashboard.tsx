'use client';

import React, { useState } from 'react';
import { Input } from "./components/ui/input";

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Cpu, Timer } from 'lucide-react';

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

  const filteredData = mcpData.filter((mcp) =>
    mcp.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">MCP Call Stack Dashboard</h1>

      <Input
        placeholder="Search MCPs..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      <ScrollArea className="h-[600px] w-full rounded-md border p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredData.map((mcp) => (
            <Card key={mcp.name} className="shadow-md">
              <CardContent className="p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold">{mcp.name}</h2>
                  <Badge
                    variant={
                      mcp.status === 'healthy'
                        ? 'default'
                        : mcp.status === 'degraded'
                        ? 'outline'
                        : 'destructive'
                    }
                  >
                    {mcp.status}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Cpu className="w-4 h-4" />
                    Stack Trace:
                  </div>
                  <ul className="text-sm list-disc list-inside text-muted-foreground">
                    {mcp.stack.map((func, i) => (
                      <li key={i}>{func}</li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Timer className="w-4 h-4" />
                  Execution Time: {mcp.executionTimeMs} ms
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
