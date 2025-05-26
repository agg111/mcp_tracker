import React from "react";
import { Play, MessageSquare, Copy, Check } from "lucide-react";

interface Prompt {
	name: string;
	description?: string;
	arguments?: Array<{
		name: string;
		description?: string;
		required?: boolean;
		type?: string;
	}>;
}

interface PromptResult {
	id: number;
	promptName: string;
	inputs: Record<string, string | number>;
	timestamp: string;
	status: "success" | "error";
	duration: number;
	result: any;
	error?: string;
}

interface PromptsTabProps {
	availablePrompts: Prompt[];
	selectedPrompt: Prompt | null;
	setSelectedPrompt: (prompt: Prompt | null) => void;
	promptInputs: Record<string, string | number>;
	setPromptInputs: (inputs: Record<string, string | number>) => void;
	promptResults: PromptResult[];
	setPromptResults: (results: PromptResult[]) => void;
	isExecutingPrompt: boolean;
	onExecutePrompt: () => void;
}

export const PromptsTab: React.FC<PromptsTabProps> = ({
	availablePrompts,
	selectedPrompt,
	setSelectedPrompt,
	promptInputs,
	setPromptInputs,
	promptResults,
	setPromptResults,
	isExecutingPrompt,
	onExecutePrompt,
}) => {
	const [copiedResult, setCopiedResult] = React.useState<number | null>(null);

	const handleInputChange = (argName: string, value: string | number) => {
		setPromptInputs({
			...promptInputs,
			[argName]: value,
		});
	};

	const copyToClipboard = async (text: string, resultId: number) => {
		try {
			await navigator.clipboard.writeText(text);
			setCopiedResult(resultId);
			setTimeout(() => setCopiedResult(null), 2000);
		} catch (err) {
			console.error("Failed to copy text: ", err);
		}
	};

	const clearResults = () => {
		setPromptResults([]);
	};

	const renderPromptArguments = () => {
		if (!selectedPrompt?.arguments) return null;

		return (
			<div className="space-y-4">
				<h3 className="text-lg font-semibold text-text-primary">
					Arguments
				</h3>
				{selectedPrompt.arguments.map((arg) => (
					<div key={arg.name} className="space-y-2">
						<label className="block text-sm font-medium text-text-primary select-text">
							{arg.name}
							{arg.required && (
								<span className="text-red-500 ml-1">*</span>
							)}
							{arg.description && (
								<span className="text-text-secondary ml-2 font-normal select-text">
									- {arg.description}
								</span>
							)}
						</label>
						{arg.type === "textarea" || arg.name.toLowerCase().includes("content") ? (
							<textarea
								value={promptInputs[arg.name] || ""}
								onChange={(e) =>
									handleInputChange(arg.name, e.target.value)
								}
								className="w-full px-3 py-2 border border-border rounded-md bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent min-h-[100px]"
								style={{ 
									userSelect: 'text',
									WebkitUserSelect: 'text',
									MozUserSelect: 'text',
									msUserSelect: 'text'
								}}
								placeholder={`Enter ${arg.name}...`}
								spellCheck={false}
								onDoubleClick={(e) => {
									e.preventDefault();
									const target = e.target as HTMLTextAreaElement;
									console.log('Double-click detected on textarea, value:', target.value);
									if (target.value.startsWith('http://') || target.value.startsWith('https://')) {
										console.log('URL detected, selecting all');
										target.select();
										target.focus();
									}
								}}
								onSelect={(e) => {
									e.stopPropagation();
								}}
								onMouseDown={(e) => {
									// Ensure text selection is enabled
									e.currentTarget.style.userSelect = 'text';
								}}
							/>
						) : (
							<input
								type={arg.type === "number" ? "number" : "text"}
								value={promptInputs[arg.name] || ""}
								onChange={(e) =>
									handleInputChange(
										arg.name,
										arg.type === "number"
											? parseFloat(e.target.value) || 0
											: e.target.value
									)
								}
								className="w-full px-3 py-2 border border-border rounded-md bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
								style={{ 
									userSelect: 'text',
									WebkitUserSelect: 'text',
									MozUserSelect: 'text',
									msUserSelect: 'text'
								}}
								placeholder={`Enter ${arg.name}...`}
								spellCheck={false}
								onDoubleClick={(e) => {
									e.preventDefault();
									const target = e.target as HTMLInputElement;
									console.log('Double-click detected on input, value:', target.value);
									if (target.value.startsWith('http://') || target.value.startsWith('https://')) {
										console.log('URL detected, selecting all');
										target.select();
										target.focus();
									} else {
										// For non-URLs, allow normal double-click word selection
										console.log('Non-URL, allowing normal selection');
									}
								}}
								onMouseDown={(e) => {
									// Ensure text selection is enabled
									e.currentTarget.style.userSelect = 'text';
								}}
							/>
						)}
					</div>
				))}
			</div>
		);
	};

	const canExecute = () => {
		if (!selectedPrompt) return false;
		if (!selectedPrompt.arguments) return true;

		return selectedPrompt.arguments.every((arg) => {
			if (!arg.required) return true;
			const value = promptInputs[arg.name];
			return value !== undefined && value !== "";
		});
	};

	return (
		<div className="h-full flex overflow-hidden">
			{/* Left Panel - Prompt Selection and Configuration */}
			<div className="w-1/2 p-6 border-r border-border overflow-y-auto">
				<div className="space-y-6 min-w-0">
					<div>
						<h2 className="text-2xl font-bold text-text-primary mb-4 select-text">
							Prompts
						</h2>
						<p className="text-text-secondary select-text">
							Execute prompts to generate content or get structured responses.
						</p>
					</div>

					{/* Prompt Selection */}
					<div className="space-y-4">
						<h3 className="text-lg font-semibold text-text-primary select-text">
							Available Prompts ({availablePrompts.length})
						</h3>
						{availablePrompts.length === 0 ? (
							<p className="text-text-secondary select-text">
								No prompts available. Make sure your MCP server supports prompts.
							</p>
						) : (
							<div className="space-y-2">
								{availablePrompts.map((prompt) => (
									<div
										key={prompt.name}
										onClick={() => {
											setSelectedPrompt(prompt);
											setPromptInputs({});
										}}
										className={`p-3 border rounded-lg cursor-pointer transition-colors ${
											selectedPrompt?.name === prompt.name
												? "border-accent bg-accent/10"
												: "border-border hover:border-accent/50"
										}`}
									>
										<div className="flex items-center space-x-2">
											<MessageSquare className="h-4 w-4 text-accent" />
											<span className="font-medium text-text-primary select-text">
												{prompt.name}
											</span>
										</div>
										{prompt.description && (
											<p className="text-sm text-text-secondary mt-1 break-words select-text">
												{prompt.description}
											</p>
										)}
									</div>
								))}
							</div>
						)}
					</div>

					{/* Prompt Configuration */}
					{selectedPrompt && (
						<div className="space-y-4">
							<div>
								<h3 className="text-lg font-semibold text-text-primary select-text">
									Selected Prompt: {selectedPrompt.name}
								</h3>
								{selectedPrompt.description && (
									<p className="text-text-secondary mt-1 break-words select-text">
										{selectedPrompt.description}
									</p>
								)}
							</div>

							{renderPromptArguments()}

							<button
								onClick={onExecutePrompt}
								disabled={isExecutingPrompt || !canExecute()}
								className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-accent text-white rounded-md hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								<Play className="h-4 w-4" />
								<span>
									{isExecutingPrompt ? "Executing..." : "Execute Prompt"}
								</span>
							</button>
						</div>
					)}
				</div>
			</div>

			{/* Right Panel - Results */}
			<div className="w-1/2 p-6 overflow-y-auto min-w-0">
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<h3 className="text-lg font-semibold text-text-primary select-text">
							Execution Results ({promptResults.length})
						</h3>
						{promptResults.length > 0 && (
							<button
								onClick={clearResults}
								className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
							>
								Clear Results
							</button>
						)}
					</div>

					<div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
						{promptResults.length === 0 ? (
							<p className="text-text-secondary select-text">
								No prompt executions yet. Execute a prompt to see results here.
							</p>
						) : (
							promptResults.map((result) => (
								<div
									key={result.id}
									className="border border-border rounded-lg p-4 space-y-3 break-words"
								>
									<div className="flex items-center justify-between">
										<div className="flex items-center space-x-2 min-w-0">
											<span className="font-medium text-text-primary truncate select-text">
												{result.promptName}
											</span>
											<span
												className={`px-2 py-1 text-xs rounded ${
													result.status === "success"
														? "bg-green-100 text-green-800"
														: "bg-red-100 text-red-800"
												}`}
											>
												{result.status}
											</span>
										</div>
										<div className="flex items-center space-x-2 text-sm text-text-secondary select-text">
											<span>{result.duration}ms</span>
											<span>
												{new Date(result.timestamp).toLocaleTimeString()}
											</span>
										</div>
									</div>

									{Object.keys(result.inputs).length > 0 && (
										<div>
											<h4 className="text-sm font-medium text-text-primary mb-1 select-text">
												Inputs:
											</h4>
											<div className="text-sm text-text-secondary bg-bg-secondary p-2 rounded max-w-full">
												{Object.entries(result.inputs).map(([key, value]) => {
													const stringValue = String(value);
													const isUrl = stringValue.startsWith('http://') || stringValue.startsWith('https://');
													return (
														<div key={key} className="break-words">
															<strong className="select-text">{key}:</strong>{' '}
															<span className={`break-all ${isUrl ? 'select-url' : 'select-text cursor-text'}`}>
																{stringValue}
															</span>
														</div>
													);
												})}
											</div>
										</div>
									)}

									{result.error ? (
										<div>
											<h4 className="text-sm font-medium text-red-600 mb-1 select-text">
												Error:
											</h4>
											<div className="text-sm text-red-600 bg-red-50 p-2 rounded break-words select-text cursor-text">
												{result.error}
											</div>
										</div>
									) : (
										<div>
											<div className="flex items-center justify-between mb-1">
												<h4 className="text-sm font-medium text-text-primary select-text">
													Result:
												</h4>
												<button
													onClick={() =>
														copyToClipboard(
															typeof result.result === "string"
																? result.result
																: JSON.stringify(result.result, null, 2),
															result.id
														)
													}
													className="flex items-center space-x-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors shrink-0"
												>
													{copiedResult === result.id ? (
														<Check className="h-3 w-3 text-green-600" />
													) : (
														<Copy className="h-3 w-3" />
													)}
													<span>
														{copiedResult === result.id ? "Copied!" : "Copy"}
													</span>
												</button>
											</div>
											<div className="text-sm bg-bg-secondary p-3 rounded max-h-64 overflow-y-auto">
												{typeof result.result === "string" ? (
													<div 
														className="whitespace-pre-wrap break-words text-text-primary font-mono text-xs leading-relaxed select-text cursor-text"
														onDoubleClick={(e) => {
															const selection = window.getSelection();
															const range = document.createRange();
															range.selectNodeContents(e.currentTarget);
															selection?.removeAllRanges();
															selection?.addRange(range);
														}}
													>
														{result.result}
													</div>
												) : (
													<pre 
														className="text-text-primary whitespace-pre-wrap break-words text-xs leading-relaxed overflow-wrap-anywhere select-text cursor-text"
														onDoubleClick={(e) => {
															const selection = window.getSelection();
															const range = document.createRange();
															range.selectNodeContents(e.currentTarget);
															selection?.removeAllRanges();
															selection?.addRange(range);
														}}
													>
														{JSON.stringify(result.result, null, 2)}
													</pre>
												)}
											</div>
										</div>
									)}
								</div>
							))
						)}
					</div>
				</div>
			</div>
		</div>
	);
};