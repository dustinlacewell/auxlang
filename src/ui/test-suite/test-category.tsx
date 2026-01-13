interface TestCategoryProps {
	name: string;
	color?: string;
	hidden?: boolean;
	children: React.ReactNode;
}

export function TestCategory({ name, color, hidden, children }: TestCategoryProps) {
	return (
		<div className={`mb-6 ${hidden ? "hidden" : ""}`}>
			<h2
				className="text-lg font-medium border-b pb-1 mb-3"
				style={{ color, borderColor: color }}
			>
				{name}
			</h2>
			<div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">{children}</div>
		</div>
	);
}
