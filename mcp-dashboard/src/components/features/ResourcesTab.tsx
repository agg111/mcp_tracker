import React from "react";
import { Copy, XCircle } from "lucide-react";
import { Resource } from "../../types";
import { copyToClipboard } from "../../utils";

interface ResourcesTabProps {
	availableResources: Resource[];
	selectedResource: Resource | null;
	setSelectedResource: (resource: Resource | null) => void;
	resourceContent: any | null;
	setResourceContent: (content: any) => void;
	onResourceRead: (resource: Resource) => void;
}

export const ResourcesTab: React.FC<ResourcesTabProps> = ({
	availableResources,
	selectedResource,
	setSelectedResource,
	resourceContent,
	setResourceContent,
	onResourceRead,
}) => {
	return (
		<div className="p-6">
			<h2 className="text-xl font-semibold text-gray-900 mb-6">
				Resources
			</h2>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Resources List */}
				<div className="space-y-4">
					<h3 className="text-lg font-medium text-gray-900">
						Available Resources
					</h3>
					<div className="space-y-2">
						{availableResources.map((resource) => (
							<div
								key={resource.uri}
								className={`p-4 border rounded-lg cursor-pointer transition-colors ${
									selectedResource?.uri === resource.uri
										? "border-indigo-500 bg-indigo-50"
										: "border-gray-200 hover:border-gray-300"
								}`}
								onClick={() => {
									setSelectedResource(resource);
									setResourceContent(null);
									onResourceRead(resource);
								}}
							>
								<h4 className="font-medium text-gray-900">
									{resource.name}
								</h4>
								<p className="text-sm text-gray-600 mt-1">
									{resource.description}
								</p>
								<p className="text-xs text-gray-500 mt-1">
									{resource.uri}
								</p>
								<span className="inline-block mt-2 px-2 py-1 bg-gray-100 text-xs rounded">
									{resource.mimeType}
								</span>
							</div>
						))}
					</div>

					{/* No Resources Message */}
					{availableResources.length === 0 && (
						<div className="text-center py-8 text-gray-500">
							<span className="text-4xl mb-2 block">📄</span>
							<p>No resources available</p>
							<p className="text-sm">
								Connect to an MCP server that provides resources
							</p>
						</div>
					)}
				</div>

				{/* Resource Content */}
				{selectedResource && !resourceContent && (
					<div className="flex items-center justify-center h-64">
						<div className="text-center">
							<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4"></div>
							<p className="text-gray-600">
								Loading resource content...
							</p>
						</div>
					</div>
				)}

				{resourceContent && (
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<h3 className="text-lg font-medium text-gray-900">
								Resource Content
							</h3>
							<div className="flex items-center space-x-2">
								<button
									onClick={() =>
										copyToClipboard(
											resourceContent.text ||
												resourceContent.blob
										)
									}
									className="text-gray-500 hover:text-gray-700 flex items-center space-x-1"
								>
									<Copy className="h-4 w-4" />
									<span className="text-sm">Copy</span>
								</button>
								<button
									onClick={() => {
										setSelectedResource(null);
										setResourceContent(null);
									}}
									className="text-gray-500 hover:text-gray-700"
								>
									<XCircle className="h-4 w-4" />
								</button>
							</div>
						</div>

						<div className="border rounded-lg">
							<div className="bg-gray-50 px-4 py-2 border-b text-sm text-gray-600 flex items-center justify-between">
								<div>
									<span className="font-medium">
										{selectedResource?.name}
									</span>
									<span className="ml-2 text-gray-400">
										•
									</span>
									<span className="ml-2">
										{resourceContent.mimeType}
									</span>
								</div>
								<span className="text-xs">
									{resourceContent.text
										? `${resourceContent.text.length} chars`
										: "Binary content"}
								</span>
							</div>

							{/* Content Display */}
							<div className="p-4">
								{resourceContent.text ? (
									<pre className="text-sm text-gray-800 overflow-x-auto max-h-96 bg-gray-50 p-3 rounded border whitespace-pre-wrap">
										{resourceContent.text}
									</pre>
								) : resourceContent.blob ? (
									/* Binary Content */
									<div className="text-center py-8 text-gray-500">
										<span className="text-4xl mb-2 block">
											📦
										</span>
										<p>
											Binary content cannot be displayed
										</p>
										<p className="text-sm">
											Size: {resourceContent.blob.length}{" "}
											bytes (base64)
										</p>
										<button
											onClick={() =>
												copyToClipboard(
													resourceContent.blob
												)
											}
											className="mt-2 bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded text-sm"
										>
											Copy Base64
										</button>
									</div>
								) : (
									/* No Content */
									<div className="text-center py-8 text-gray-500">
										<span className="text-4xl mb-2 block">
											❓
										</span>
										<p>No content available</p>
									</div>
								)}
							</div>
						</div>
					</div>
				)}

				{!selectedResource && (
					<div className="text-center py-12 text-gray-500">
						<span className="text-4xl mb-4 block">📄</span>
						<h3 className="text-lg font-medium text-gray-900 mb-2">
							Select a Resource
						</h3>
						<p>
							Choose a resource from the list to view its content
						</p>
					</div>
				)}
			</div>
		</div>
	);
};
