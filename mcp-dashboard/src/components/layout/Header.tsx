import React from "react";
import { Bug, Square, Trash2, Settings, Bell, User } from "lucide-react";

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
	onClearLogs,
}) => {
	const getStatusColor = () => {
		switch (connectionStatus) {
			case "connected":
				return "bg-success";
			case "connecting":
				return "bg-warning";
			default:
				return "bg-error";
		}
	};

	const getStatusText = () => {
		switch (connectionStatus) {
			case "connected":
				return "Connected";
			case "connecting":
				return "Connecting";
			default:
				return "Disconnected";
		}
	};

	return (
		<header className="bg-bg-elevated/80 backdrop-blur-md border-b border-border-light sticky top-0 z-50">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex justify-between items-center h-16">
					{/* Logo and Brand */}
					<div className="flex items-center space-x-4">
						<div className="flex items-center space-x-3">
							<div className="relative">
								<Bug className="h-8 w-8 text-primary" />
							</div>
							<div>
								<h1 className="text-xl font-bold text-text-primary tracking-tight">
									Spyder
								</h1>
							</div>
						</div>

						{/* Connection Status */}
						<div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-bg-secondary rounded-full border border-border-light">
							<div
								className={`w-2 h-2 rounded-full ${getStatusColor()} ${
									connectionStatus === "connecting"
										? "animate-pulse"
										: ""
								}`}
							/>
							<span className="text-sm font-medium text-text-secondary">
								{getStatusText()}
							</span>
						</div>
					</div>

					{/* Actions */}
					<div className="flex items-center space-x-2">
						{/* Quick Stats - Hidden on mobile */}
						<div className="hidden lg:flex items-center space-x-4 mr-4">
							<div className="text-center">
								<div className="text-xs text-text-tertiary">
									Uptime
								</div>
								<div className="text-sm font-semibold text-text-secondary">
									2h 34m
								</div>
							</div>
							<div className="w-px h-8 bg-border-light" />
							<div className="text-center">
								<div className="text-xs text-text-tertiary">
									Calls
								</div>
								<div className="text-sm font-semibold text-text-secondary">
									142
								</div>
							</div>
						</div>

						{/* Action Buttons */}
						<div className="flex items-center space-x-1">
							{/* Notifications */}
							<button
								className="
                p-2 rounded-lg text-text-secondary hover:text-text-primary
                hover:bg-bg-secondary transition-all duration-base
                relative
              "
							>
								<Bell className="h-5 w-5" />
								<div className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full" />
							</button>

							{/* Clear Logs */}
							<button
								onClick={onClearLogs}
								className="
                  p-2 rounded-lg text-text-secondary hover:text-text-primary
                  hover:bg-bg-secondary transition-all duration-base
                  tooltip tooltip-bottom
                "
								title="Clear all logs and messages"
							>
								<Trash2 className="h-5 w-5" />
							</button>

							{/* Settings */}
							<button
								className="
                p-2 rounded-lg text-text-secondary hover:text-text-primary
                hover:bg-bg-secondary transition-all duration-base
              "
							>
								<Settings className="h-5 w-5" />
							</button>

							{/* Disconnect Button */}
							{isConnected && (
								<button
									onClick={onDisconnect}
									className="
                    ml-2 px-4 py-2 bg-error hover:bg-error-dark text-white
                    rounded-lg font-medium transition-all duration-base
                    flex items-center space-x-2 text-sm
                    shadow-sm hover:shadow-md
                  "
								>
									<Square className="h-4 w-4" />
									<span className="hidden sm:inline">
										Disconnect
									</span>
								</button>
							)}
						</div>

						{/* Profile */}
						<div className="ml-3 relative">
							<button
								className="
                flex items-center space-x-2 p-2 rounded-lg
                text-text-secondary hover:text-text-primary
                hover:bg-bg-secondary transition-all duration-base
              "
							>
								<div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center">
									<User className="h-4 w-4 text-white" />
								</div>
							</button>
						</div>
					</div>
				</div>

				{/* Mobile Connection Status */}
				<div className="sm:hidden pb-3">
					<div className="flex items-center space-x-2 px-3 py-1.5 bg-bg-secondary rounded-full border border-border-light">
						<div
							className={`w-2 h-2 rounded-full ${getStatusColor()} ${
								connectionStatus === "connecting"
									? "animate-pulse"
									: ""
							}`}
						/>
						<span className="text-sm font-medium text-text-secondary">
							{getStatusText()}
						</span>
					</div>
				</div>
			</div>
		</header>
	);
};
