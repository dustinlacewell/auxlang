/**
 * The live editor as a standard code embed: same EmbedFrame silhouette as the
 * docs' CodeBlock — a mobile-only patch-list tab top-left (the sidebar covers
 * this on desktop), playback and graph toggle tabs top-right, the graph
 * expanding inside the frame. The code surface is the editable CodeMirror;
 * Ctrl+Enter re-evaluates while playing.
 */

import type { SlotDecl } from "auxlang/runtime/live/live-contract";
import type { SourceMap } from "auxlang/source/source-map";
import { TabButton } from "@/ui/design/tab-button";
import { EmbedFrame } from "@/ui/docs-kit/embed-frame";
import { PatchGraph } from "@/ui/docs-kit/patch-graph";
import { Check, Link, List, Play, Square, Waypoints } from "lucide-react";
import { useState } from "react";
import { CodeMirror } from "./code-mirror";
import { shareUrlFor } from "./share-url";

interface EditorEmbedProps {
	code: string;
	onChange: (code: string) => void;
	isPlaying: boolean;
	sourceMap: SourceMap;
	liveSlots: readonly SlotDecl[];
	ensureSlotSite: (site: number) => Promise<void>;
	onRun: () => void;
	onStop: () => void;
	/** Opens the mobile patch-list drawer (the sidebar is a persistent column on desktop). */
	onOpenPatches: () => void;
}

/** Copies a share link for the current patch and mirrors it into the address bar. */
function ShareTab({ code }: { code: string }) {
	const [copied, setCopied] = useState(false);
	return (
		<TabButton
			active={false}
			title="Copy share link"
			onClick={() => {
				const url = shareUrlFor(code);
				history.replaceState(null, "", url);
				void navigator.clipboard.writeText(url);
				setCopied(true);
				setTimeout(() => setCopied(false), 1500);
			}}
		>
			{copied ? <Check size={12} className="text-green-400" /> : <Link size={12} />}
		</TabButton>
	);
}

export function EditorEmbed({
	code,
	onChange,
	isPlaying,
	sourceMap,
	liveSlots,
	ensureSlotSite,
	onRun,
	onStop,
	onOpenPatches,
}: EditorEmbedProps) {
	const [showGraph, setShowGraph] = useState(false);
	return (
		<EmbedFrame
			tabsLeft={
				<>
					<div className="md:hidden">
						<TabButton active={false} title="Patches" onClick={onOpenPatches}>
							<span className="flex items-center gap-1">
								<List size={12} /> patches
							</span>
						</TabButton>
					</div>
					<span className="self-center text-[10px] text-gray-500 pl-2 hidden sm:inline">
						Ctrl+Enter runs · Ctrl+. stops
					</span>
				</>
			}
			tabsRight={
				<>
					<TabButton
						active={isPlaying}
						title={isPlaying ? "Stop (Ctrl+.)" : "Run (Ctrl+Enter)"}
						onClick={isPlaying ? onStop : onRun}
					>
						{isPlaying ? <Square size={12} className="text-white" /> : <Play size={12} />}
					</TabButton>
					<TabButton
						active={showGraph}
						title="Signal graph"
						onClick={() => setShowGraph((s) => !s)}
					>
						<Waypoints size={12} />
					</TabButton>
					<ShareTab code={code} />
				</>
			}
			panel={showGraph ? <PatchGraph code={code} /> : undefined}
		>
			<CodeMirror
				value={code}
				onChange={onChange}
				onRun={onRun}
				onStop={onStop}
				sourceMap={sourceMap}
				liveSlots={liveSlots}
				isPlaying={isPlaying}
				ensureSlotSite={ensureSlotSite}
				className="text-xs"
			/>
		</EmbedFrame>
	);
}
