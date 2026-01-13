/**
 * Simple tabs component.
 */

import { useState } from "react";

interface Tab {
	id: string;
	label: string;
	content: React.ReactNode;
}

interface TabsProps {
	tabs: Tab[];
	className?: string;
}

export function Tabs({ tabs, className = "" }: TabsProps) {
	const [activeId, setActiveId] = useState(tabs[0]?.id ?? "");

	const activeTab = tabs.find((t) => t.id === activeId);

	return (
		<div className={className}>
			<div className="flex border-b border-surface-700 mb-4">
				{tabs.map((tab) => (
					<button
						key={tab.id}
						type="button"
						onClick={() => setActiveId(tab.id)}
						className={`px-4 py-2 text-sm font-medium transition-colors ${
							tab.id === activeId
								? "text-accent-400 border-b-2 border-accent-400"
								: "text-surface-400 hover:text-surface-200"
						}`}
					>
						{tab.label}
					</button>
				))}
			</div>
			<div>{activeTab?.content}</div>
		</div>
	);
}
