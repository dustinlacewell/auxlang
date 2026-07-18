/**
 * Module-docs page: a section per module CATEGORY (sources, filters, envelopes,
 * effects, utils, math, timing, drums), each a grid of runnable example cards
 * over ONE shared audio host. Same chrome as the pattern-docs page (max-w
 * container, header with Stop All, underlined sections) — the module is the
 * star: every card demonstrates one facet of one module.
 */

import { DocCard } from "@/ui/docs-kit/doc-card";
import { DocSection } from "@/ui/docs-kit/doc-section";
import { useSharedAudio } from "@/ui/docs-kit/use-shared-audio";
import { Button } from "@/ui/design/button";
import { Square } from "lucide-react";
import { useMemo } from "react";
import { EXAMPLES, SECTIONS } from "./examples";

const cardId = (section: string, title: string): string => `${section}::${title}`;

export function ModuleDocsApp() {
	const { playingId, errors, run, halt } = useSharedAudio();

	const bySection = useMemo(() => {
		const map = new Map<string, (typeof EXAMPLES)[number][]>();
		for (const section of SECTIONS) map.set(section, []);
		for (const ex of EXAMPLES) map.get(ex.section)?.push(ex);
		return map;
	}, []);

	return (
		<div className="min-h-screen p-5 max-w-6xl mx-auto">
			<div className="flex justify-between items-start mb-4">
				<div>
					<h1 className="text-2xl font-bold mb-1">Auxlang Module Docs</h1>
					<p className="text-sm text-gray-400">
						Every card is a live patch — one module, one facet. Hit Run to hear it.
					</p>
				</div>
				<Button
					variant="chrome"
					onClick={halt}
					className="text-red-400 hover:text-red-300 shrink-0"
				>
					<span className="flex items-center gap-1.5">
						<Square size={14} />
						Stop All
					</span>
				</Button>
			</div>

			{SECTIONS.map((section) => (
				<DocSection key={section} name={section}>
					{(bySection.get(section) ?? []).map((ex) => {
						const id = cardId(section, ex.title);
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
				</DocSection>
			))}
		</div>
	);
}
