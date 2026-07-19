/**
 * Modules page: the module reference and its examples, unified. Grouped by
 * category (registry order within each), every registered module gets a block:
 * its reference card (ports, units, defaults) leading the grid, followed by
 * that module's runnable example cards over ONE shared audio host. Examples
 * attach to their module via the "module — facet" title law, checked against
 * the live registry. The grouped nav jumps per module.
 */

import "@/core3/modules/all";

import { getRegistry, hasModule } from "@/core3/module/define";
import type { Category, ModuleSpec } from "@/core3/types";
import { ModuleBadge } from "@/ui/design/module-badge";
import { CATEGORY_ORDER } from "@/ui/docs-kit/category-order";
import { DocCard } from "@/ui/docs-kit/doc-card";
import type { DocExample } from "@/ui/docs-kit/doc-example";
import { sectionAnchor } from "@/ui/docs-kit/doc-section";
import { GroupedSectionNav } from "@/ui/docs-kit/grouped-section-nav";
import { ModuleName } from "@/ui/docs-kit/module-name";
import { useSharedAudio } from "@/ui/docs-kit/use-shared-audio";
import { SitePage } from "@/ui/site/site-page";
import { useMemo } from "react";
import { EXAMPLES } from "./examples";

const registry = getRegistry();

/** "sin — default" → "sin", when registered; the title law makes this reliable. */
function moduleOf(title: string): string | null {
	const at = title.indexOf(" — ");
	const head = at === -1 ? title : title.slice(0, at);
	return hasModule(head) ? head : null;
}

const cardId = (module: string, title: string): string => `${module}::${title}`;

export function ModuleDocsApp() {
	const { playingId, errors, run, halt } = useSharedAudio();

	const examplesByModule = useMemo(() => {
		const map = new Map<string, DocExample[]>();
		for (const ex of EXAMPLES) {
			const mod = moduleOf(ex.title);
			if (!mod) {
				console.warn(`[module-docs] example title matches no module: "${ex.title}"`);
				continue;
			}
			const list = map.get(mod);
			if (list) list.push(ex);
			else map.set(mod, [ex]);
		}
		return map;
	}, []);

	const modulesByCategory = useMemo(() => {
		const map = new Map<Category, ModuleSpec[]>(CATEGORY_ORDER.map((c) => [c, []]));
		for (const spec of registry.values()) map.get(spec.category)?.push(spec);
		return map;
	}, []);

	const navGroups = CATEGORY_ORDER.flatMap((cat) => {
		const mods = modulesByCategory.get(cat) ?? [];
		if (mods.length === 0) return [];
		return [
			{
				label: cat,
				category: cat,
				sections: mods.map((m) => ({ name: m.name, module: m.name })),
			},
		];
	});

	return (
		<SitePage current="modules" onStopAll={halt}>
			<div className="mb-4">
				<h1 className="text-xl font-bold mb-1">Modules</h1>
				<p className="text-sm text-gray-400">
					Every module: its ports, then one facet per example card.
				</p>
			</div>

			<GroupedSectionNav groups={navGroups} />

			{CATEGORY_ORDER.map((cat) => {
				const mods = modulesByCategory.get(cat) ?? [];
				if (mods.length === 0) return null;
				return (
					<div key={cat} className="mb-8">
						<h2 className="mb-3 sticky top-11 z-10">
							<ModuleBadge category={cat} size="md" plural fullWidth />
						</h2>
						{mods.map((spec) => (
							<div key={spec.name} id={sectionAnchor(spec.name)} className="mt-8 mb-5 scroll-mt-16">
								<h3 className="mb-2 text-lg">
									<ModuleName name={spec.name} />
									{spec.doc && <span className="text-sm text-gray-400 ml-2">{spec.doc}</span>}
								</h3>
								{(examplesByModule.get(spec.name) ?? []).length > 0 && (
									<div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-3 items-start">
										{(examplesByModule.get(spec.name) ?? []).map((ex) => {
											const id = cardId(spec.name, ex.title);
											return (
												<DocCard
													key={id}
													example={ex}
													playing={playingId === id}
													onRun={() => run(id, ex.code)}
													onStop={halt}
													{...(errors[id] ? { error: errors[id] } : {})}
												/>
											);
										})}
									</div>
								)}
							</div>
						))}
					</div>
				);
			})}
		</SitePage>
	);
}
