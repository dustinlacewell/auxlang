/**
 * One documentation example: status dot + title, gray description, and the
 * code block — whose tab buttons carry the playback and graph toggles — with
 * the loud error below. The code is read-only: these are docs, not an editor.
 *
 * Titles following the "module — facet" law get their module name rendered
 * through ModName (registry-checked, so a title that merely looks like one
 * stays plain).
 */

import "@/core3/modules/all";

import { hasModule } from "@/core3/module/define";
import { Card } from "@/ui/design/card";
import { ErrorDisplay } from "@/ui/design/error-display";
import { StatusIndicator } from "@/ui/design/status-indicator";
import { CodeBlock } from "./code-block";
import type { DocExample } from "./doc-example";
import { ModuleName } from "./module-name";

interface DocCardProps {
	example: DocExample;
	playing: boolean;
	error?: string;
	onRun: () => void;
	onStop: () => void;
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

export function DocCard({ example, playing, error, onRun, onStop }: DocCardProps) {
	const status = error ? "error" : playing ? "playing" : "idle";
	return (
		<Card status={status}>
			<div className="flex items-center gap-2 mb-1 font-bold">
				<StatusIndicator status={status} />
				<span className="flex-1">{renderTitle(example.title)}</span>
			</div>
			<p className="text-sm text-gray-400 mb-2">{example.description}</p>
			<CodeBlock code={example.code} playing={playing} onTogglePlay={playing ? onStop : onRun} />
			{error && <ErrorDisplay message={error} />}
		</Card>
	);
}
