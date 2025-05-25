import React from "react";
import {
	Play,
	Clock,
	Zap,
	Globe,
	Terminal,
	AlertCircle,
	CheckCircle2,
	Copy,
} from "lucide-react";
import { ConnectionConfig } from "../../types";

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
	onConnect,
}) => {
	const [copiedCommand, setCopiedCommand] = React.useState(false);

	const copyCommand = async () => {
		const command = `${connectionConfig.command} ${connectionConfig.args
			.filter(Boolean)
			.join(" ")}`;
		await navigator.clipboard.writeText(command);
		setCopiedCommand(true);
		setTimeout(() => setCopiedCommand(false), 2000);
	};

	const getStatusBadgeClass = () => {
		switch (connectionStatus) {
			case "connected":
				return "badge-success";
			case "connecting":
				return "badge-warning";
			case "error":
				return "badge-error";
			default:
				return "badge-gray";
		}
	};

	const getConnectionStatusIcon = () => {
		switch (connectionStatus) {
			case "connected":
				return <CheckCircle2 className="h-4 w-4" />;
			case "connecting":
				return <Clock className="h-4 w-4 animate-spin" />;
			case "error":
				return <AlertCircle className="h-4 w-4" />;
			default:
				return null;
		}
	};

	return (
		<div className="p-6 space-y-6">
			{/* Header with Status */}
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold text-primary mb-1">
						Server Connection
					</h2>
					<p className="text-secondary text-sm">
						Configure and connect to your MCP server
					</p>
				</div>

				{/* Connection Status Indicator */}
				<div
					className={`status-indicator badge ${getStatusBadgeClass()}`}
				>
					{getConnectionStatusIcon()}
					<span className="capitalize">
						{connectionStatus || "Disconnected"}
					</span>
				</div>
			</div>

			<div className="max-w-screen-xl space-y-6">
				{/* Connection Type Selection */}
				<div className="card p-6">
					<h3 className="text-lg font-semibold text-primary mb-4">
						Connection Method
					</h3>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{/* Stdio Card */}
						<div
							className={`relative p-4 border-2 rounded-xl cursor-pointer transition-all duration-base hover:scale-[1.02] ${
								connectionConfig.type === "stdio"
									? "border-primary bg-primary-alpha shadow-lg"
									: "border-border bg-elevated shadow-sm hover:border-primary"
							}`}
							onClick={() =>
								setConnectionConfig((prev) => ({
									...prev,
									type: "stdio",
								}))
							}
						>
							<div className="flex items-start gap-3">
								<div
									className={`p-2 rounded-lg ${
										connectionConfig.type === "stdio"
											? "bg-primary text-white"
											: "bg-tertiary text-secondary"
									}`}
								>
									<Terminal className="h-5 w-5" />
								</div>
								<div className="flex-1">
									<h4 className="font-semibold text-primary mb-1">
										Standard I/O
									</h4>
									<p className="text-sm text-secondary mb-2">
										Connect to local MCP servers via
										stdin/stdout
									</p>
									<div className="flex items-center gap-2">
										<span className="badge badge-warning">
											Requires Bridge
										</span>
									</div>
								</div>
							</div>
						</div>

						{/* HTTP Card */}
						<div
							className={`relative p-4 border-2 rounded-xl cursor-pointer transition-all duration-base hover:scale-[1.02] ${
								connectionConfig.type === "http"
									? "border-primary bg-primary-alpha shadow-lg"
									: "border-border bg-elevated shadow-sm hover:border-primary"
							}`}
							onClick={() =>
								setConnectionConfig((prev) => ({
									...prev,
									type: "http",
								}))
							}
						>
							<div className="flex items-start gap-3">
								<div
									className={`p-2 rounded-lg ${
										connectionConfig.type === "http"
											? "bg-primary text-white"
											: "bg-tertiary text-secondary"
									}`}
								>
									<Globe className="h-5 w-5" />
								</div>
								<div className="flex-1">
									<h4 className="font-semibold text-primary mb-1">
										HTTP/WebSocket
									</h4>
									<p className="text-sm text-secondary mb-2">
										Connect directly to HTTP-based MCP
										servers
									</p>
									<div className="flex items-center gap-2">
										<span className="badge badge-success">
											Direct Connection
										</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Configuration Forms */}
				{connectionConfig.type === "stdio" ? (
					<div className="space-y-6">
						{/* Command Configuration */}
						<div className="card p-6">
							<h3 className="text-lg font-semibold text-primary mb-4">
								Command Configuration
							</h3>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="label">
										Base Command
									</label>
									<input
										type="text"
										className="input"
										value={connectionConfig.command}
										onChange={(e) =>
											setConnectionConfig((prev) => ({
												...prev,
												command: e.target.value.trim(),
											}))
										}
										placeholder="uv"
									/>
									<p className="helper-text">
										Main executable (e.g., "uv", "python",
										"node")
									</p>
								</div>

								<div>
									<label className="label">Subcommand</label>
									<input
										type="text"
										className="input"
										value={
											connectionConfig.subcommand || ""
										}
										onChange={(e) =>
											setConnectionConfig((prev) => ({
												...prev,
												subcommand:
													e.target.value.trim(),
												args: e.target.value.trim()
													? [
															e.target.value.trim(),
															prev.filename || "",
													  ].filter(Boolean)
													: [
															prev.filename || "",
													  ].filter(Boolean),
											}))
										}
										placeholder="run"
									/>
									<p className="helper-text">
										Optional subcommand (e.g., "run" for uv)
									</p>
								</div>
							</div>
						</div>

						{/* Server Details */}
						<div className="card p-6">
							<h3 className="text-lg font-semibold text-primary mb-4">
								Server Details
							</h3>

							<div className="space-y-4">
								<div>
									<label className="label">
										MCP Server File
									</label>
									<input
										type="text"
										className="input"
										value={connectionConfig.filename || ""}
										onChange={(e) =>
											setConnectionConfig((prev) => ({
												...prev,
												filename: e.target.value.trim(),
												args: [
													prev.subcommand || "",
													e.target.value.trim(),
												].filter(Boolean),
											}))
										}
										placeholder="weather.py"
									/>
									<p className="helper-text">
										The MCP server script to execute
									</p>
								</div>

								<div>
									<label className="label">
										Working Directory
									</label>
									<input
										type="text"
										className="input"
										value={connectionConfig.workingDir}
										onChange={(e) =>
											setConnectionConfig((prev) => ({
												...prev,
												workingDir: e.target.value,
											}))
										}
										placeholder="/path/to/server"
									/>
									<p className="helper-text">
										Directory where the server should run
									</p>
								</div>

								<div>
									<label className="label">
										Additional Arguments
									</label>
									<input
										type="text"
										className="input"
										value={connectionConfig.extraArgs || ""}
										onChange={(e) => {
											const extraArgs =
												e.target.value.trim()
													? e.target.value
															.trim()
															.split(/\s+/)
													: [];
											setConnectionConfig((prev) => ({
												...prev,
												extraArgs: e.target.value,
												args: [
													prev.subcommand || "",
													prev.filename || "",
													...extraArgs,
												].filter(Boolean),
											}));
										}}
										placeholder="--debug --verbose"
									/>
									<p className="helper-text">
										Extra command line flags
										(space-separated)
									</p>
								</div>
							</div>
						</div>

						{/* Command Preview */}
						<div className="card p-6 border-l-4 border-l-primary">
							<div className="flex items-center justify-between mb-4">
								<h3 className="text-lg font-semibold text-primary">
									Command Preview
								</h3>
								<button
									onClick={copyCommand}
									className="btn btn-secondary btn-sm"
									title="Copy command"
								>
									{copiedCommand ? (
										<>
											<CheckCircle2 className="h-3 w-3" />
											<span>Copied!</span>
										</>
									) : (
										<>
											<Copy className="h-3 w-3" />
											<span>Copy</span>
										</>
									)}
								</button>
							</div>

							<div className="space-y-3">
								<div>
									<div className="flex items-center gap-2 mb-2">
										<Terminal className="h-4 w-4 text-primary" />
										<span className="text-sm font-medium text-secondary">
											Full Command
										</span>
									</div>
									<div className="font-mono text-sm bg-secondary border border-border rounded-lg p-3 text-primary">
										<span className="text-primary font-semibold">
											{connectionConfig.command}
										</span>
										{connectionConfig.args.filter(Boolean)
											.length > 0 && (
											<span className="text-secondary">
												{" "}
												{connectionConfig.args
													.filter(Boolean)
													.join(" ")}
											</span>
										)}
									</div>
								</div>

								{connectionConfig.workingDir && (
									<div>
										<div className="mb-2">
											<span className="text-sm font-medium text-secondary">
												Working Directory
											</span>
										</div>
										<div className="font-mono text-sm bg-secondary border border-border rounded-lg p-3 text-primary">
											{connectionConfig.workingDir}
										</div>
									</div>
								)}
							</div>
						</div>

						{/* Bridge Notice */}
						<div className="card p-6 border-l-4 border-l-warning bg-warning-light">
							<div className="flex items-start gap-3">
								<AlertCircle className="h-5 w-5 text-warning-dark mt-0.5" />
								<div>
									<h4 className="font-semibold text-warning-dark mb-1">
										WebSocket Bridge Required
									</h4>
									<p className="text-sm text-warning-dark">
										Browser-based connections to stdio
										servers require a WebSocket bridge
										service. Ensure your bridge is running
										at{" "}
										<code className="bg-warning text-warning-dark px-1 rounded font-mono text-xs">
											ws://localhost:8080/mcp-bridge
										</code>
									</p>
								</div>
							</div>
						</div>
					</div>
				) : (
					/* HTTP Configuration */
					<div className="card p-6">
						<h3 className="text-lg font-semibold text-primary mb-4">
							HTTP Configuration
						</h3>

						<div>
							<label className="label">Server URL</label>
							<input
								type="url"
								className="input"
								value={connectionConfig.httpUrl}
								onChange={(e) =>
									setConnectionConfig((prev) => ({
										...prev,
										httpUrl: e.target.value,
									}))
								}
								placeholder="http://localhost:8000"
							/>
							<p className="helper-text">
								Full URL to your HTTP-based MCP server
							</p>
						</div>
					</div>
				)}

				{/* Connection Action */}
				<div className="flex justify-center pt-6">
					<button
						onClick={onConnect}
						disabled={
							isConnected || connectionStatus === "connecting"
						}
						className={`btn ${
							isConnected ? "btn-success" : "btn-primary"
						} btn-lg`}
					>
						{connectionStatus === "connecting" ? (
							<>
								<Clock className="h-5 w-5 animate-spin" />
								<span>Connecting...</span>
							</>
						) : isConnected ? (
							<>
								<CheckCircle2 className="h-5 w-5" />
								<span>Connected</span>
							</>
						) : (
							<>
								<Zap className="h-5 w-5" />
								<span>Connect to Server</span>
							</>
						)}
					</button>
				</div>
			</div>
		</div>
	);
};
