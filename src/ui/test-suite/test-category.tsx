interface TestCategoryProps {
	name: string;
	children: React.ReactNode;
}

export function TestCategory({ name, children }: TestCategoryProps) {
	return (
		<div className="mb-6">
			<h2 className="text-lg font-medium text-accent-blue border-b border-surface-700 pb-1 mb-3">
				{name}
			</h2>
			<div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">{children}</div>
		</div>
	);
}
