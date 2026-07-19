/**
 * Section jump-nav for a long docs page whose sections cluster into concepts:
 * one row per group — a small uppercase label, then text links. Quieter than a
 * pill cloud and shows the page's actual structure. Links scroll to the
 * section's anchor (DocSection.sectionAnchor); `label` overrides the link text
 * when the section name is too long for a nav row. A section that names a
 * registered `module` renders through ModuleName — category-colored, its card
 * on hover — like every module name on the site.
 */

import type { Category } from "@/core3/types";
import { categoryColors } from "@/theme/colors";
import { sectionAnchor } from "@/ui/docs-kit/doc-section";
import { ModuleName } from "@/ui/docs-kit/module-name";

export interface SectionGroup {
	label: string;
	/** Tints the group label with the category's color. */
	category?: Category;
	sections: readonly { name: string; label?: string; module?: string }[];
}

export function GroupedSectionNav({ groups }: { groups: readonly SectionGroup[] }) {
	const scrollTo = (name: string) => {
		document.getElementById(sectionAnchor(name))?.scrollIntoView({
			behavior: "smooth",
			block: "start",
		});
	};

	return (
		<nav className="mb-6 border-b border-surface-700 pb-3 flex flex-col gap-1.5">
			{groups.map((group) => (
				<div key={group.label} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
					<span
						className={`text-[10px] uppercase tracking-wider w-24 shrink-0 ${
							group.category ? "" : "text-gray-500"
						}`}
						{...(group.category ? { style: { color: categoryColors[group.category] } } : {})}
					>
						{group.label}
					</span>
					{group.sections.map((s) => (
						<button
							key={s.name}
							type="button"
							onClick={() => scrollTo(s.name)}
							className="text-sm text-gray-400 hover:text-white transition-colors"
						>
							{s.module ? <ModuleName name={s.module} bold={false} /> : (s.label ?? s.name)}
						</button>
					))}
				</div>
			))}
		</nav>
	);
}
