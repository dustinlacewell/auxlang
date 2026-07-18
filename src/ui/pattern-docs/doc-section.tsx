/**
 * A titled group of doc cards. Mirrors the test-suite CategorySection layout:
 * an underlined heading over an auto-filling card grid.
 */

interface DocSectionProps {
	name: string;
	children: React.ReactNode;
}

export function DocSection({ name, children }: DocSectionProps) {
	return (
		<div className="mb-6">
			<h2 className="text-lg font-medium border-b border-surface-700 pb-1 mb-3 text-accent-blue">
				{name}
			</h2>
			<div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-3 items-stretch">
				{children}
			</div>
		</div>
	);
}
