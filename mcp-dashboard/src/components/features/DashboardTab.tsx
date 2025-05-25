import React from "react";
import {
	Activity,
	Zap,
	Database,
	MessageSquare,
	TrendingUp,
	Clock,
	CheckCircle,
	XCircle,
	ArrowUpRight,
	BarChart3,
} from "lucide-react";
import {
	AreaChart,
	Area,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	BarChart,
	Bar,
} from "recharts";

interface DashboardProps {
	isConnected: boolean;
	availableTools: any[];
	availableResources: any[];
	availablePrompts: any[];
	logs: any[];
	rawMessages: any[];
	toolResults: any[];
	serverInfo: any;
	onNavigate: (tab: string) => void;
}

// Mock data for charts - in real app this would come from props/API
const activityData = [
	{ date: "12/20", tools: 4, resources: 2, errors: 1 },
	{ date: "12/21", tools: 7, resources: 3, errors: 0 },
	{ date: "12/22", tools: 12, resources: 5, errors: 2 },
	{ date: "12/23", tools: 8, resources: 4, errors: 1 },
	{ date: "12/24", tools: 15, resources: 7, errors: 0 },
	{ date: "12/25", tools: 6, resources: 2, errors: 1 },
	{ date: "12/26", tools: 18, resources: 9, errors: 3 },
];

const toolUsageData = [
	{ name: "weather", calls: 24 },
	{ name: "calculator", calls: 18 },
	{ name: "search", calls: 12 },
	{ name: "file-reader", calls: 8 },
	{ name: "translator", calls: 6 },
];

export const DashboardTab: React.FC<DashboardProps> = ({
	isConnected,
	availableTools,
	availableResources,
	availablePrompts,
	logs,
	rawMessages,
	toolResults,
	serverInfo,
	onNavigate,
}) => {
	const successfulCalls = toolResults.filter(
		(r) => r.status === "success"
	).length;
	const errorCalls = toolResults.filter((r) => r.status === "error").length;
	const totalCalls = toolResults.length;

	const recentActivity = logs
		.slice(-5)
		.reverse()
		.map((log, idx) => ({
			id: idx,
			type: log.level,
			message: log.message,
			timestamp: log.timestamp,
			details: log.details,
		}));

	const StatCard = ({
		title,
		value,
		icon: Icon,
		status,
		trend,
		onClick,
	}: {
		title: string;
		value: number | string;
		icon: any;
		status?: "online" | "offline" | "warning";
		trend?: number;
		onClick?: () => void;
	}) => (
		<div
			className={`
        bg-bg-elevated border border-border-light rounded-xl p-6
        hover:shadow-lg transition-all duration-base cursor-pointer
        group hover:border-border-dark
      `}
			onClick={onClick}
		>
			<div className="flex items-center justify-between">
				<div className="flex items-center space-x-3">
					<div
						className={`
            p-3 rounded-lg
            ${
				status === "online"
					? "bg-success-light text-success-dark"
					: status === "offline"
					? "bg-error-light text-error-dark"
					: "bg-primary-alpha text-primary"
			}
          `}
					>
						<Icon className="h-5 w-5" />
					</div>
					<div>
						<p className="text-text-secondary text-sm font-medium">
							{title}
						</p>
						<p className="text-text-primary text-2xl font-bold">
							{value}
						</p>
					</div>
				</div>

				<div className="flex flex-col items-end space-y-2">
					{status && (
						<div className="flex items-center space-x-1">
							{status === "online" ? (
								<CheckCircle className="h-4 w-4 text-success" />
							) : (
								<XCircle className="h-4 w-4 text-error" />
							)}
							<span
								className={`text-xs font-medium ${
									status === "online"
										? "text-success-dark"
										: "text-error-dark"
								}`}
							>
								{status}
							</span>
						</div>
					)}

					{trend !== undefined && (
						<div className="flex items-center space-x-1">
							<ArrowUpRight
								className={`h-3 w-3 ${
									trend >= 0 ? "text-success" : "text-error"
								}`}
							/>
							<span
								className={`text-xs ${
									trend >= 0 ? "text-success" : "text-error"
								}`}
							>
								{Math.abs(trend)}%
							</span>
						</div>
					)}
				</div>
			</div>
		</div>
	);

	return (
		<div className="min-h-screen bg-bg-primary">
			{/* Header */}
			<div className="bg-bg-elevated border-b border-border-light">
				<div className="max-w-7xl mx-auto px-6 py-8">
					<div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
						<div>
							<h1 className="text-3xl font-bold text-text-primary mb-2">
								MCP Inspector Dashboard
							</h1>
							<p className="text-text-secondary">
								Monitor and test your Model Context Protocol
								tools in real-time
							</p>
						</div>

						{serverInfo && (
							<div className="bg-bg-secondary border border-border-light rounded-lg p-4">
								<div className="flex items-center space-x-2 mb-1">
									<div
										className={`w-2 h-2 rounded-full ${
											isConnected
												? "bg-success"
												: "bg-error"
										}`}
									/>
									<span className="text-sm font-medium text-text-primary">
										{serverInfo.name}
									</span>
								</div>
								<p className="text-xs text-text-secondary">
									v{serverInfo.version}
								</p>
							</div>
						)}
					</div>
				</div>
			</div>

			<div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
				{/* Stats Grid */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
					<StatCard
						title="Tools Available"
						value={availableTools.length}
						icon={Zap}
						status={isConnected ? "online" : "offline"}
						trend={12}
						onClick={() => onNavigate("tools")}
					/>
					<StatCard
						title="Resources"
						value={availableResources.length}
						icon={Database}
						status={isConnected ? "online" : "offline"}
						trend={8}
						onClick={() => onNavigate("resources")}
					/>
					<StatCard
						title="Prompts"
						value={availablePrompts.length}
						icon={MessageSquare}
						status={isConnected ? "online" : "offline"}
						trend={-2}
						onClick={() => onNavigate("prompts")}
					/>
					<StatCard
						title="Success Rate"
						value={
							totalCalls > 0
								? `${Math.round(
										(successfulCalls / totalCalls) * 100
								  )}%`
								: "0%"
						}
						icon={TrendingUp}
						trend={5}
					/>
				</div>

				{/* Charts Section */}
				<div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
					{/* Activity Chart */}
					<div className="bg-bg-elevated border border-border-light rounded-xl p-6">
						<div className="flex items-center justify-between mb-6">
							<h3 className="text-lg font-semibold text-text-primary">
								Activity Overview
							</h3>
							<button
								onClick={() => onNavigate("logs")}
								className="text-primary hover:text-primary-dark text-sm font-medium transition-colors"
							>
								View All Logs →
							</button>
						</div>
						<div className="h-64">
							<ResponsiveContainer width="100%" height="100%">
								<AreaChart data={activityData}>
									<defs>
										<linearGradient
											id="toolsGradient"
											x1="0"
											y1="0"
											x2="0"
											y2="1"
										>
											<stop
												offset="5%"
												stopColor="var(--primary)"
												stopOpacity={0.3}
											/>
											<stop
												offset="95%"
												stopColor="var(--primary)"
												stopOpacity={0}
											/>
										</linearGradient>
										<linearGradient
											id="errorsGradient"
											x1="0"
											y1="0"
											x2="0"
											y2="1"
										>
											<stop
												offset="5%"
												stopColor="var(--error)"
												stopOpacity={0.3}
											/>
											<stop
												offset="95%"
												stopColor="var(--error)"
												stopOpacity={0}
											/>
										</linearGradient>
									</defs>
									<CartesianGrid
										strokeDasharray="3 3"
										stroke="var(--border-light)"
									/>
									<XAxis
										dataKey="date"
										axisLine={false}
										tickLine={false}
										tick={{
											fill: "var(--text-secondary)",
											fontSize: 12,
										}}
									/>
									<YAxis
										axisLine={false}
										tickLine={false}
										tick={{
											fill: "var(--text-secondary)",
											fontSize: 12,
										}}
									/>
									<Tooltip
										contentStyle={{
											backgroundColor:
												"var(--bg-elevated)",
											border: "1px solid var(--border-light)",
											borderRadius: "8px",
											boxShadow: "var(--shadow-lg)",
										}}
									/>
									<Area
										type="monotone"
										dataKey="tools"
										stroke="var(--primary)"
										fillOpacity={1}
										fill="url(#toolsGradient)"
										strokeWidth={2}
									/>
									<Area
										type="monotone"
										dataKey="errors"
										stroke="var(--error)"
										fillOpacity={1}
										fill="url(#errorsGradient)"
										strokeWidth={2}
									/>
								</AreaChart>
							</ResponsiveContainer>
						</div>
					</div>

					{/* Tool Usage Chart */}
					<div className="bg-bg-elevated border border-border-light rounded-xl p-6">
						<div className="flex items-center justify-between mb-6">
							<h3 className="text-lg font-semibold text-text-primary">
								Tool Usage
							</h3>
							<button
								onClick={() => onNavigate("tools")}
								className="text-primary hover:text-primary-dark text-sm font-medium transition-colors"
							>
								Manage Tools →
							</button>
						</div>
						<div className="h-64">
							<ResponsiveContainer width="100%" height="100%">
								<BarChart
									data={toolUsageData}
									layout="horizontal"
								>
									<CartesianGrid
										strokeDasharray="3 3"
										stroke="var(--border-light)"
									/>
									<XAxis
										type="number"
										axisLine={false}
										tickLine={false}
										tick={{
											fill: "var(--text-secondary)",
											fontSize: 12,
										}}
									/>
									<YAxis
										type="category"
										dataKey="name"
										axisLine={false}
										tickLine={false}
										tick={{
											fill: "var(--text-secondary)",
											fontSize: 12,
										}}
										width={80}
									/>
									<Tooltip
										contentStyle={{
											backgroundColor:
												"var(--bg-elevated)",
											border: "1px solid var(--border-light)",
											borderRadius: "8px",
											boxShadow: "var(--shadow-lg)",
										}}
									/>
									<Bar
										dataKey="calls"
										fill="var(--primary)"
										radius={[0, 4, 4, 0]}
									/>
								</BarChart>
							</ResponsiveContainer>
						</div>
					</div>
				</div>

				{/* Recent Activity */}
				<div className="bg-bg-elevated border border-border-light rounded-xl p-6">
					<div className="flex items-center justify-between mb-6">
						<h3 className="text-lg font-semibold text-text-primary">
							Recent Activity
						</h3>
						<button
							onClick={() => onNavigate("logs")}
							className="text-primary hover:text-primary-dark text-sm font-medium transition-colors"
						>
							View All Activity →
						</button>
					</div>

					<div className="space-y-4">
						{recentActivity.length > 0 ? (
							recentActivity.map((activity) => (
								<div
									key={activity.id}
									className="flex items-center space-x-4 p-4 bg-bg-secondary rounded-lg hover:bg-bg-tertiary transition-colors"
								>
									<div
										className={`
                    w-2 h-2 rounded-full flex-shrink-0
                    ${
						activity.type === "success"
							? "bg-success"
							: activity.type === "error"
							? "bg-error"
							: activity.type === "warning"
							? "bg-warning"
							: "bg-primary"
					}
                  `}
									/>

									<div className="flex-1 min-w-0">
										<p className="text-sm text-text-primary font-medium truncate">
											{activity.message}
										</p>
										<p className="text-xs text-text-secondary">
											{new Date(
												activity.timestamp
											).toLocaleTimeString()}
										</p>
									</div>

									<Clock className="h-4 w-4 text-text-tertiary flex-shrink-0" />
								</div>
							))
						) : (
							<div className="text-center py-8">
								<Activity className="h-12 w-12 text-text-tertiary mx-auto mb-4" />
								<p className="text-text-secondary">
									No recent activity
								</p>
								<p className="text-text-tertiary text-sm">
									Connect to an MCP server to start monitoring
								</p>
							</div>
						)}
					</div>
				</div>

				{/* Quick Actions */}
				{!isConnected && (
					<div className="bg-gradient-to-r from-primary-alpha to-primary-light/20 border border-primary/20 rounded-xl p-6">
						<div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
							<div>
								<h3 className="text-lg font-semibold text-text-primary mb-2">
									Get Started with MCP Inspector
								</h3>
								<p className="text-text-secondary">
									Connect to your MCP server to start
									monitoring tools, resources, and
									performance.
								</p>
							</div>
							<button
								onClick={() => onNavigate("connection")}
								className="
                  bg-primary hover:bg-primary-dark text-white
                  px-6 py-3 rounded-lg font-medium transition-colors
                  flex items-center space-x-2 whitespace-nowrap
                "
							>
								<Zap className="h-4 w-4" />
								<span>Connect Server</span>
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};
