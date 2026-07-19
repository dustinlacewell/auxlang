/**
 * A titled group of doc cards. Mirrors the test-suite CategorySection layout:
 * an underlined heading over an auto-filling card grid. The heading carries an
 * id so pages can anchor-scroll to a section. When the section corresponds to
 * a module category, pass it — the heading and its underline take the
 * category's color so the page follows the site-wide convention.
 */

import type { Category } from "@/core3/types";
import { categoryColors } from "@/theme/colors";

interface DocSectionProps {
	name: string;
	/** The module category this section covers, if any — tints heading + rule. */
	category?: Category;
	children: React.ReactNode;
}

export function DocSection({ name, category, children }: DocSectionProps) {
	const tint = category ? categoryColors[category] : undefined;
	return (
		<div className="mb-6">
			<h2
				id={sectionAnchor(name)}
				className={`text-lg font-medium border-b pb-1 mb-3 scroll-mt-16 ${
					tint ? "" : "text-gray-100 border-surface-700"
				}`}
				{...(tint ? { style: { color: tint, borderColor: `${tint}55` } } : {})}
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
