interface PanelProps {
	title?: string;
	children: React.ReactNode;
	className?: string;
}

export function Panel({ title, children, className = "" }: PanelProps) {
	return (
		<div className={`bg-surface-800 border border-surface-700 rounded-lg ${className}`}>
			{title && (
				<div className="px-4 py-2 border-b border-surface-700 text-sm font-medium text-accent-blue">
					{title}
				</div>
			)}
			<div className="p-4">{children}</div>
		</div>
	);
}
