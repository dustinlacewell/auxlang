/**
 * One documentation example: status dot + title, gray description, and the
 * code block — whose tab buttons carry the playback and graph toggles — with
 * the loud error below. The code is editable; Run plays the edited text.
 *
 * Titles following the "module — facet" law get their module name rendered
 * through ModName (registry-checked, so a title that merely looks like one
 * stays plain).
 */

import "@/engine/modules/all";

import type { SlotDecl } from "@/engine/runtime/live/live-contract";
import { hasModule } from "@/engine/module/define";
import type { SourceMap } from "@/engine/source/source-map";
import { Card } from "@/ui/design/card";
import { StatusIndicator } from "@/ui/design/status-indicator";
import type { DocExample } from "./doc-example";
import { ModuleName } from "./module-name";
import { RunnableCode } from "./runnable-code";

interface DocCardProps {
	example: DocExample;
	playing: boolean;
	error?: string;
	onRun: (code: string) => void;
	onStop: () => void;
	/** The playing program's location tables, for pattern highlight/control widgets. Only meaningful while `playing`. */
	sourceMap?: SourceMap | undefined;
	/** The playing program's live slots, for control widgets. */
	liveSlots?: readonly SlotDecl[] | undefined;
	/** Turns a dragged number literal's site into a live slot. */
	onEnsureSlotSite?: ((site: number) => Promise<void>) | undefined;
}

/** "sin — default" → colored ModName + rest; anything else passes through. */
function renderTitle(title: string): React.ReactNode {
	const sep = " — ";
	const at = title.indexOf(sep);
	if (at === -1) return title;
	const head = title.slice(0, at);
	if (!hasModule(head)) return title;
	return (
		<>
			<ModuleName name={head} />
			{title.slice(at)}
		</>
	);
}

export function DocCard({
	example,
	playing,
	error,
	onRun,
	onStop,
	sourceMap,
	liveSlots,
	onEnsureSlotSite,
}: DocCardProps) {
	const status = error ? "error" : playing ? "playing" : "idle";
	return (
		<Card status={status}>
			<div className="flex items-center gap-2 mb-1 font-bold">
				<StatusIndicator status={status} />
				<span className="flex-1">{renderTitle(example.title)}</span>
			</div>
			<p className="text-sm text-gray-400 mb-2">{example.description}</p>
			<RunnableCode
				code={example.code}
				playing={playing}
				onRun={onRun}
				onStop={onStop}
				sourceMap={playing ? sourceMap : undefined}
				liveSlots={playing ? liveSlots : undefined}
				onEnsureSlotSite={playing ? onEnsureSlotSite : undefined}
				{...(error ? { error } : {})}
			/>
		</Card>
	);
}
