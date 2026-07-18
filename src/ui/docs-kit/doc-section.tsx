/**
 * A titled group of doc cards. Mirrors the test-suite CategorySection layout:
 * an underlined heading over an auto-filling card grid. The heading carries an
 * id so pages can anchor-scroll to a section.
 */

interface DocSectionProps {
	name: string;
	children: React.ReactNode;
}

export function DocSection({ name, children }: DocSectionProps) {
	return (
		<div className="mb-6">
			<h2
				id={sectionAnchor(name)}
				className="text-lg font-medium border-b border-surface-700 pb-1 mb-3 text-accent-blue scroll-mt-4"
			>
				{name}
			</h2>
			<div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-3 items-stretch">
				{children}
			</div>
		</div>
	);
}

/** Stable DOM id for a section heading, shared by DocSection and any anchor nav. */
export function sectionAnchor(name: string): string {
	return `sec-${name.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}`;
}
