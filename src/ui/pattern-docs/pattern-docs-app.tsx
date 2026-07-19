/**
 * Patterns page: a section per notation/combinator/bridge concept, each a
 * grid of runnable example cards over ONE shared audio host. Pure pattern
 * language — the module reference lives on the modules page. Shares the site
 * shell and docs chrome (page header with Stop All, grouped section nav).
 */

import { DocCard } from "@/ui/docs-kit/doc-card";
import { DocSection } from "@/ui/docs-kit/doc-section";
import { GroupedSectionNav } from "@/ui/docs-kit/grouped-section-nav";
import { useSharedAudio } from "@/ui/docs-kit/use-shared-audio";
import { SitePage } from "@/ui/site/site-page";
import { useMemo } from "react";
import { EXAMPLES, SECTIONS, SECTION_GROUPS } from "./examples";

const cardId = (section: string, title: string): string => `${section}::${title}`;

export function PatternDocsApp() {
	const { playingId, errors, run, halt } = useSharedAudio();

	const bySection = useMemo(() => {
		const map = new Map<string, (typeof EXAMPLES)[number][]>();
		for (const section of SECTIONS) map.set(section, []);
		for (const ex of EXAMPLES) map.get(ex.section)?.push(ex);
		return map;
	}, []);

	return (
		<SitePage current="patterns" onStopAll={halt}>
			<div className="mb-4">
				<h1 className="text-xl font-bold mb-1">Patterns</h1>
				<p className="text-sm text-gray-400">
					The pattern is the star; the voice is a plain gated synth.
				</p>
			</div>

			<GroupedSectionNav groups={SECTION_GROUPS} />

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
		</SitePage>
	);
}
