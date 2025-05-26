import React from "react";
import {
	Home,
	Settings,
	Play,
	Database,
	MessageSquare,
	FileText,
	Activity,
	Terminal,
	ChevronLeft,
	ChevronRight,
} from "lucide-react";
import { ServerInfo } from "../../types";

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
	isCollapsed?: boolean;
	onToggleCollapse?: () => void;
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
	serverInfo,
	isCollapsed = false,
	onToggleCollapse,
}) => {
	const navItems = [
		{
			id: "dashboard",
			label: "Dashboard",
			icon: Home,
			disabled: false,
			count: null,
			description: "Overview and analytics",
		},
		{
			id: "connection",
			label: "Connection",
			icon: Settings,
			disabled: false,
			count: null,
			description: "Server connection settings",
		},
		{
			id: "tools",
			label: "Tools",
			icon: Play,
			disabled: !isConnected,
			count: availableTools.length,
			description: "Execute and manage MCP tools",
		},
		{
			id: "resources",
			label: "Resources",
			icon: Database,
			disabled: !isConnected,
			count: availableResources.length,
			description: "Browse server resources",
		},
		{
			id: "prompts",
			label: "Prompts",
			icon: MessageSquare,
			disabled: !isConnected || availablePrompts.length === 0,
			count: availablePrompts.length,
			description: "Manage prompt templates",
		},
		{
			id: "logs",
			label: "Activity Logs",
			icon: Activity,
			disabled: false,
			count: logs.length,
			description: "View application logs",
		},
		{
			id: "raw",
			label: "Raw Messages",
			icon: Terminal,
			disabled: false,
			count: rawMessages.length,
			description: "JSON-RPC message inspector",
		},
	];

	const NavItem = ({ item }: { item: (typeof navItems)[0] }) => {
		const isActive = activeTab === item.id;
		const hasNotification = item.count !== null && item.count > 0;

		return (
			<button
				onClick={() => !item.disabled && setActiveTab(item.id)}
				disabled={item.disabled}
				className={`
          w-full group relative flex items-center px-3 py-2.5 rounded-lg
          transition-all duration-base text-left
          ${
				isActive
					? "bg-primary text-white shadow-md"
					: item.disabled
					? "text-text-disabled cursor-not-allowed opacity-50"
					: "text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
			}
          ${!isCollapsed ? "justify-start" : "justify-center"}
        `}
				title={
					isCollapsed
						? `${item.label}${
								item.count !== null ? ` (${item.count})` : ""
						  }`
						: ""
				}
			>
				<div className="flex items-center space-x-3 min-w-0">
					<item.icon
						className={`
            h-5 w-5 flex-shrink-0
            ${isActive ? "text-white" : ""}
          `}
					/>

					{!isCollapsed && (
						<>
							<div className="flex-1 min-w-0">
								<div className="flex items-center justify-between">
									<span className="font-medium truncate">
										{item.label}
									</span>
									{hasNotification && (
										<span
											className={`
                      ml-2 px-2 py-0.5 text-xs font-semibold rounded-full
                      ${
							isActive
								? "bg-white/20 text-white"
								: "bg-primary text-white"
						}
                    `}
										>
											{item.count! > 99
												? "99+"
												: item.count}
										</span>
									)}
								</div>
								<p
									className={`
                  text-xs mt-0.5 truncate
                  ${isActive ? "text-white/80" : "text-text-tertiary"}
                `}
								>
									{item.description}
								</p>
							</div>
						</>
					)}
				</div>

				{/* Active indicator */}
				{isActive && (
					<div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
				)}

				{/* Hover tooltip for collapsed state */}
				{isCollapsed && !item.disabled && (
					<div
						className="
            absolute left-full ml-2 px-3 py-2 bg-bg-elevated border border-border-light
            rounded-lg shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none
            transition-opacity duration-base z-50 whitespace-nowrap
          "
					>
						<div className="text-sm font-medium text-text-primary">
							{item.label}
						</div>
						<div className="text-xs text-text-secondary mt-0.5">
							{item.description}
						</div>
						{hasNotification && (
							<div className="text-xs text-primary mt-1">
								{item.count} items
							</div>
						)}
					</div>
				)}
			</button>
		);
	};

	return (
		<nav
			className={`
      bg-bg-elevated border-r border-border-light h-full flex flex-col
      transition-all duration-300 ease-out
      ${isCollapsed ? "w-16" : "w-64"}
    `}
		>
			{/* Toggle Button */}
			{onToggleCollapse && (
				<div className="p-4 border-b border-border-light">
					<button
						onClick={onToggleCollapse}
						className="
              w-full flex items-center justify-center p-2 rounded-lg
              text-text-secondary hover:text-text-primary hover:bg-bg-secondary
              transition-all duration-base
            "
					>
						{isCollapsed ? (
							<ChevronRight className="h-5 w-5" />
						) : (
							<ChevronLeft className="h-5 w-5" />
						)}
					</button>
				</div>
			)}

			{/* Navigation Items */}
			<div className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin">
				{navItems.map((item) => (
					<NavItem key={item.id} item={item} />
				))}
			</div>

			{/* Server Info */}
			{serverInfo && !isCollapsed && (
				<div className="p-4 border-t border-border-light">
					<div className="bg-bg-secondary border border-border-light rounded-lg p-3">
						<div className="flex items-center space-x-2 mb-2">
							<div
								className={`w-2 h-2 rounded-full ${
									isConnected ? "bg-success" : "bg-error"
								}`}
							/>
							<h3 className="text-sm font-semibold text-text-primary truncate">
								{serverInfo.name}
							</h3>
						</div>
						<div className="space-y-1 text-xs text-text-secondary">
							<div className="flex justify-between">
								<span>Version:</span>
								<span className="font-medium">
									{serverInfo.version}
								</span>
							</div>
							{serverInfo.protocolVersion && (
								<div className="flex justify-between">
									<span>Protocol:</span>
									<span className="font-medium">
										{serverInfo.protocolVersion}
									</span>
								</div>
							)}
						</div>
					</div>
				</div>
			)}

			{/* Collapsed Server Info */}
			{serverInfo && isCollapsed && (
				<div className="p-4 border-t border-border-light">
					<div className="flex justify-center">
						<div
							className={`
              w-3 h-3 rounded-full
              ${isConnected ? "bg-success" : "bg-error"}
            `}
							title={`${serverInfo.name} - ${
								isConnected ? "Connected" : "Disconnected"
							}`}
						/>
					</div>
				</div>
			)}
		</nav>
	);
};
