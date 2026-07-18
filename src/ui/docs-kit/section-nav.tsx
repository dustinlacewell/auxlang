/**
 * Category selector for a long docs page: the rainbow pill cloud the old
 * device-tests page carried at the top (see src/ui/test-suite/shared/
 * filter-cloud.tsx + category-colors.ts). Same look — a centered "Categories"
 * heading over evenly-hued, rounded-full pills — but since these docs pages
 * render every section at once, a click scrolls to that section's anchor
 * (DocSection.sectionAnchor) rather than filtering.
 */

import { useMemo } from "react";
import { generateCategoryColorMap, getColor } from "@/ui/test-suite/shared/category-colors";
import { sectionAnchor } from "@/ui/docs-kit/doc-section";

interface SectionNavProps {
	/** Section headings, in page order — one pill each. */
	sections: readonly string[];
}

export function SectionNav({ sections }: SectionNavProps) {
	const colorMap = useMemo(() => generateCategoryColorMap([...sections]), [sections]);

	const scrollTo = (section: string) => {
		document.getElementById(sectionAnchor(section))?.scrollIntoView({
			behavior: "smooth",
			block: "start",
		});
	};

	return (
		<div className="mb-6">
			<h3 className="text-sm font-medium text-gray-400 mb-2 text-center">Categories</h3>
			<div className="flex flex-wrap gap-2 justify-center">
				{sections.map((section) => {
					const color = getColor(colorMap, section);
					return (
						<button
							key={section}
							type="button"
							onClick={() => scrollTo(section)}
							style={{ backgroundColor: color, borderColor: color }}
							className="px-3 py-1 rounded-full text-sm font-medium text-gray-900 border-2 transition-colors"
						>
							{section}
						</button>
					);
				})}
			</div>
		</div>
	);
}
