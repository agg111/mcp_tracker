import React from "react";
import {
	Play,
	Clock,
	CheckCircle,
	XCircle,
	Copy,
	Zap,
	Settings,
	BarChart3,
	Trash2,
} from "lucide-react";
import { Tool, ToolResult } from "../../types";
import { useToolInput } from "../../hooks/useToolInput";
import { copyToClipboard, formatDuration } from "../../utils";

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
	onExecuteTool,
}) => {
	const { renderToolInput } = useToolInput({ toolInputs, setToolInputs });

	const ToolCard = ({ tool }: { tool: Tool }) => {
		const isSelected = selectedTool?.name === tool.name;
		const requiredParams = tool.inputSchema.required || [];
		const totalParams = Object.keys(
			tool.inputSchema.properties || {}
		).length;

		return (
			<div
				className={`
          p-6 border-2 rounded-xl cursor-pointer transition-all duration-base
          hover:shadow-lg group
          ${
				isSelected
					? "border-primary bg-primary-alpha shadow-md"
					: "border-border-light bg-bg-elevated hover:border-border-dark hover:bg-bg-secondary"
			}
        `}
				onClick={() => {
					setSelectedTool(tool);
					setToolInputs({});
				}}
			>
				<div className="flex items-start justify-between mb-3">
					<div className="flex items-center space-x-3">
						<div
							className={`
              p-2 rounded-lg
              ${
					isSelected
						? "bg-primary text-white"
						: "bg-primary-alpha text-primary"
				}
            `}
						>
							<Zap className="h-5 w-5" />
						</div>
						<div>
							<h3 className="font-semibold text-text-primary">
								{tool.name}
							</h3>
							<div className="flex items-center space-x-2 mt-1">
								<span className="text-xs text-text-tertiary">
									{totalParams} parameter
									{totalParams !== 1 ? "s" : ""}
								</span>
								{requiredParams.length > 0 && (
									<>
										<span className="text-xs text-text-tertiary">
											•
										</span>
										<span className="text-xs text-error">
											{requiredParams.length} required
										</span>
									</>
								)}
							</div>
						</div>
					</div>

					{isSelected && (
						<div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
					)}
				</div>

				<p className="text-sm text-text-secondary mb-4 line-clamp-2">
					{tool.description}
				</p>

				{requiredParams.length > 0 && (
					<div className="flex flex-wrap gap-1">
						{requiredParams.slice(0, 3).map((param) => (
							<span
								key={param}
								className="px-2 py-1 bg-error-light text-error-dark text-xs rounded-full"
							>
								{param}
							</span>
						))}
						{requiredParams.length > 3 && (
							<span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
								+{requiredParams.length - 3} more
							</span>
						)}
					</div>
				)}
			</div>
		);
	};

	const ResultCard = ({ result }: { result: ToolResult }) => {
		const isSuccess = result.status === "success";

		return (
			<div
				className={`
        border rounded-xl overflow-hidden transition-all duration-base
        ${
			isSuccess
				? "border-success/20 bg-success-light/10"
				: "border-error/20 bg-error-light/10"
		}
      `}
			>
				{/* Header */}
				<div
					className={`
          px-6 py-4 border-b
          ${
				isSuccess
					? "bg-success-light border-success/20"
					: "bg-error-light border-error/20"
			}
        `}
				>
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-3">
							{isSuccess ? (
								<CheckCircle className="h-5 w-5 text-success-dark" />
							) : (
								<XCircle className="h-5 w-5 text-error-dark" />
							)}
							<div>
								<h4 className="font-semibold text-text-primary">
									{result.toolName}
								</h4>
								<div className="flex items-center space-x-2 text-sm">
									<span
										className={
											isSuccess
												? "text-success-dark"
												: "text-error-dark"
										}
									>
										{formatDuration(result.duration)}
									</span>
									<span className="text-text-tertiary">
										•
									</span>
									<span className="text-text-secondary">
										{new Date(
											result.timestamp
										).toLocaleTimeString()}
									</span>
								</div>
							</div>
						</div>

						<button
							onClick={() =>
								copyToClipboard(JSON.stringify(result, null, 2))
							}
							className="p-2 text-text-secondary hover:text-text-primary rounded-lg hover:bg-bg-secondary transition-colors"
						>
							<Copy className="h-4 w-4" />
						</button>
					</div>
				</div>

				<div className="p-6 space-y-4">
					{/* Input Parameters */}
					<div>
						<h5 className="font-medium text-text-primary mb-2">
							Input Parameters
						</h5>
						<pre className="text-sm bg-bg-secondary p-3 rounded-lg border overflow-x-auto">
							{JSON.stringify(result.inputs, null, 2)}
						</pre>
					</div>

					{/* Result or Error */}
					{isSuccess && result.result ? (
						<div>
							<h5 className="font-medium text-text-primary mb-2">
								Result
							</h5>
							<div className="bg-success-light/20 p-4 rounded-lg border border-success/20">
								<pre className="text-sm whitespace-pre-wrap break-words text-success-dark">
									{JSON.stringify(
										result.result,
										null,
										2
									).replace(/\\n/g, "\n")}
								</pre>
							</div>
						</div>
					) : (
						result.error && (
							<div>
								<h5 className="font-medium text-error-dark mb-2">
									Error
								</h5>
								<div className="bg-error-light p-4 rounded-lg border border-error/20">
									<p className="text-sm text-error-dark font-medium">
										{result.error}
									</p>
								</div>
							</div>
						)
					)}
				</div>
			</div>
		);
	};

	return (
		<div className="min-h-full bg-bg-primary">
			<div className="max-w-7xl mx-auto px-6 py-8">
				{/* Header */}
				<div className="mb-8">
					<div className="flex items-center justify-between mb-4">
						<div>
							<h1 className="text-3xl font-bold text-text-primary mb-2">
								MCP Tools
							</h1>
							<p className="text-text-secondary">
								Execute and test available MCP tools with custom
								parameters.
							</p>
						</div>

						{/* Quick Stats */}
						<div className="flex items-center space-x-4">
							<div className="text-center">
								<div className="text-2xl font-bold text-primary">
									{availableTools.length}
								</div>
								<div className="text-xs text-text-tertiary">
									Available
								</div>
							</div>
							<div className="w-px h-8 bg-border-light" />
							<div className="text-center">
								<div className="text-2xl font-bold text-success">
									{
										toolResults.filter(
											(r) => r.status === "success"
										).length
									}
								</div>
								<div className="text-xs text-text-tertiary">
									Successful
								</div>
							</div>
							<div className="w-px h-8 bg-border-light" />
							<div className="text-center">
								<div className="text-2xl font-bold text-error">
									{
										toolResults.filter(
											(r) => r.status === "error"
										).length
									}
								</div>
								<div className="text-xs text-text-tertiary">
									Failed
								</div>
							</div>
						</div>
					</div>
				</div>

				<div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
					{/* Tools List */}
					<div className="space-y-6">
						<div className="flex items-center justify-between">
							<h2 className="text-xl font-semibold text-text-primary">
								Available Tools
							</h2>
							<span className="text-sm text-text-secondary">
								{availableTools.length} tools
							</span>
						</div>

						<div className="space-y-4 max-h-96 overflow-y-auto scrollbar-thin">
							{availableTools.length > 0 ? (
								availableTools.map((tool) => (
									<ToolCard key={tool.name} tool={tool} />
								))
							) : (
								<div className="text-center py-12 bg-bg-elevated rounded-xl border border-border-light">
									<Zap className="h-12 w-12 text-text-tertiary mx-auto mb-4" />
									<h3 className="text-lg font-medium text-text-primary mb-2">
										No Tools Available
									</h3>
									<p className="text-text-secondary">
										Connect to an MCP server that provides
										tools to get started.
									</p>
								</div>
							)}
						</div>
					</div>

					{/* Tool Execution */}
					<div className="space-y-6">
						{selectedTool ? (
							<>
								<div className="bg-bg-elevated border border-border-light rounded-xl p-6">
									<div className="flex items-center justify-between mb-4">
										<h2 className="text-xl font-semibold text-text-primary">
											Execute Tool
										</h2>
										<button
											onClick={() =>
												setSelectedTool(null)
											}
											className="text-text-secondary hover:text-text-primary"
										>
											<XCircle className="h-5 w-5" />
										</button>
									</div>

									{/* Tool Info */}
									<div className="bg-primary-alpha border border-primary/20 rounded-lg p-4 mb-6">
										<h3 className="font-semibold text-primary mb-2">
											{selectedTool.name}
										</h3>
										<p className="text-sm text-primary/80">
											{selectedTool.description}
										</p>
									</div>

									{/* Parameters */}
									<div className="space-y-4">
										<h4 className="font-medium text-text-primary">
											Parameters
										</h4>
										{Object.entries(
											selectedTool.inputSchema
												.properties || {}
										).map(([property, schema]) => (
											<div key={property}>
												<label className="block text-sm font-medium text-text-primary mb-2">
													{property}
													{selectedTool.inputSchema.required?.includes(
														property
													) && (
														<span className="text-error ml-1">
															*
														</span>
													)}
													{schema.default !==
														undefined && (
														<span className="text-text-tertiary text-xs ml-2">
															(default:{" "}
															{schema.default})
														</span>
													)}
												</label>
												{renderToolInput(
													property,
													schema
												)}
												{schema.description && (
													<p className="text-xs text-text-secondary mt-1">
														{schema.description}
													</p>
												)}
											</div>
										))}

										{Object.keys(
											selectedTool.inputSchema
												.properties || {}
										).length === 0 && (
											<p className="text-text-secondary text-sm italic">
												This tool requires no parameters
											</p>
										)}
									</div>

									{/* Action Buttons */}
									<div className="flex items-center space-x-3 mt-6">
										<button
											onClick={onExecuteTool}
											disabled={isExecutingTool}
											className="
                        flex-1 bg-success hover:bg-success-dark disabled:bg-gray-400
                        text-white font-medium py-3 px-4 rounded-lg transition-all duration-base
                        flex items-center justify-center space-x-2
                        disabled:cursor-not-allowed
                      "
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

										<button
											onClick={() => setToolInputs({})}
											className="
                        px-4 py-3 bg-bg-secondary hover:bg-bg-tertiary
                        text-text-secondary hover:text-text-primary border border-border-light
                        rounded-lg transition-all duration-base
                      "
										>
											Clear
										</button>
									</div>

									{/* Input Preview */}
									{Object.keys(toolInputs).length > 0 && (
										<div className="mt-6">
											<h4 className="font-medium text-text-primary mb-2">
												Current Input
											</h4>
											<pre className="text-sm bg-bg-secondary p-3 rounded-lg border overflow-x-auto">
												{JSON.stringify(
													toolInputs,
													null,
													2
												)}
											</pre>
										</div>
									)}
								</div>
							</>
						) : (
							<div className="bg-bg-elevated border border-border-light rounded-xl p-12 text-center">
								<Settings className="h-12 w-12 text-text-tertiary mx-auto mb-4" />
								<h3 className="text-lg font-medium text-text-primary mb-2">
									Select a Tool
								</h3>
								<p className="text-text-secondary">
									Choose a tool from the list to configure and
									execute it
								</p>
							</div>
						)}
					</div>
				</div>

				{/* Execution Results */}
				{toolResults.length > 0 && (
					<div className="mt-12">
						<div className="flex items-center justify-between mb-6">
							<h2 className="text-xl font-semibold text-text-primary">
								Execution Results
							</h2>
							<div className="flex items-center space-x-4">
								<span className="text-sm text-text-secondary">
									{toolResults.length} results
								</span>
								<button
									onClick={() => setToolResults([])}
									className="
                    flex items-center space-x-2 px-3 py-1.5
                    text-text-secondary hover:text-error
                    hover:bg-error-light rounded-lg transition-all duration-base
                  "
								>
									<Trash2 className="h-4 w-4" />
									<span>Clear All</span>
								</button>
							</div>
						</div>

						<div className="space-y-4">
							{toolResults.map((result) => (
								<ResultCard key={result.id} result={result} />
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
};
