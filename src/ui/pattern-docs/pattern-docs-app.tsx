/**
 * Pattern-docs page: a section per notation/combinator/bridge concept, each a
 * grid of runnable example cards over ONE shared audio host, then the
 * auto-generated module reference. Mirrors the test-suite pattern page's
 * chrome (max-w container, header with Stop All, underlined sections).
 */

import { Button } from "@/ui/design/button";
import { Square } from "lucide-react";
import { useMemo } from "react";
import { DocCard } from "@/ui/docs-kit/doc-card";
import { DocSection } from "@/ui/docs-kit/doc-section";
import { SectionNav } from "@/ui/docs-kit/section-nav";
import { useSharedAudio } from "@/ui/docs-kit/use-shared-audio";
import { EXAMPLES, SECTIONS } from "./examples";
import { ModuleReference } from "./module-reference";

const cardId = (section: string, title: string): string => `${section}::${title}`;

export function PatternDocsApp() {
	const { playingId, errors, run, halt } = useSharedAudio();

	const bySection = useMemo(() => {
		const map = new Map<string, typeof EXAMPLES[number][]>();
		for (const section of SECTIONS) map.set(section, []);
		for (const ex of EXAMPLES) map.get(ex.section)?.push(ex);
		return map;
	}, []);

	return (
		<div className="min-h-screen p-5 max-w-6xl mx-auto">
			<div className="flex justify-between items-start mb-4">
				<div>
					<h1 className="text-2xl font-bold mb-1">Auxlang Pattern Docs</h1>
					<p className="text-sm text-gray-400">
						Every card is a live patch — the pattern is the star, the voice a plain gated synth.
					</p>
				</div>
				<Button variant="chrome" onClick={halt} className="text-red-400 hover:text-red-300 shrink-0">
					<span className="flex items-center gap-1.5">
						<Square size={14} />
						Stop All
					</span>
				</Button>
			</div>

			<SectionNav sections={SECTIONS} />

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

			<ModuleReference />
		</div>
	);
}
