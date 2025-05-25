import React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { LogEntry } from "../../types";
import { formatTimestamp } from "../../utils";

interface LogsTabProps {
	logs: LogEntry[];
	expandedLogs: Set<string>;
	onToggleLogExpansion: (logId: string) => void;
	logsEndRef: React.RefObject<HTMLDivElement | null>;
}

export const LogsTab: React.FC<LogsTabProps> = ({
	logs,
	expandedLogs,
	onToggleLogExpansion,
	logsEndRef,
}) => {
	return (
		<div className="p-6">
			<div className="flex items-center justify-between mb-6">
				<h2 className="text-xl font-semibold text-gray-900">
					Debug Logs
				</h2>
				<div className="flex items-center space-x-2">
					<span className="text-sm text-gray-600">
						{logs.length} entries
					</span>
				</div>
			</div>

			<div className="space-y-3 max-h-96 overflow-y-auto bg-white border rounded-lg p-4">
				{logs.map((log) => {
					const isExpanded = expandedLogs.has(log.id.toString());
					return (
						<div
							key={log.id}
							className={`border rounded p-3 cursor-pointer transition-colors ${
								log.level === "error"
									? "border-red-200 bg-red-50"
									: log.level === "warning"
									? "border-yellow-200 bg-yellow-50"
									: log.level === "success"
									? "border-green-200 bg-green-50"
									: "border-gray-200 bg-gray-50"
							}`}
							onClick={() =>
								onToggleLogExpansion(log.id.toString())
							}
						>
							<div className="flex items-center justify-between">
								<div className="flex items-center space-x-3">
									{isExpanded ? (
										<ChevronDown className="h-4 w-4 text-gray-500" />
									) : (
										<ChevronRight className="h-4 w-4 text-gray-500" />
									)}
									<span
										className={`px-2 py-1 rounded text-xs font-medium uppercase ${
											log.level === "error"
												? "bg-red-200 text-red-800"
												: log.level === "warning"
												? "bg-yellow-200 text-yellow-800"
												: log.level === "success"
												? "bg-green-200 text-green-800"
												: "bg-blue-200 text-blue-800"
										}`}
									>
										{log.level}
									</span>
									<span className="text-gray-800">
										{log.message}
									</span>
								</div>
								<span className="text-xs text-gray-500">
									{formatTimestamp(log.timestamp)}
								</span>
							</div>

							{isExpanded && log.details && (
								<div className="mt-3 pt-3 border-t border-gray-200">
									<pre className="text-xs text-gray-600 overflow-x-auto">
										{typeof log.details === "string"
											? log.details
											: JSON.stringify(
													log.details,
													null,
													2
											  )}
									</pre>
								</div>
							)}
						</div>
					);
				})}

				{logs.length === 0 && (
					<div className="text-center text-gray-500 py-8">
						No debug logs yet. Connect to an MCP server and perform
						actions to see logs here.
					</div>
				)}
				<div ref={logsEndRef} />
			</div>
		</div>
	);
};
