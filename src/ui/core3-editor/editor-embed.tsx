/**
 * The live editor as a standard code embed: same EmbedFrame silhouette as the
 * docs' CodeBlock — Examples dropdown tab top-left, playback and graph toggle
 * tabs top-right, the graph expanding inside the frame. The code surface is
 * the editable CodeMirror; Ctrl+Enter re-evaluates while playing.
 */

import { TabButton } from "@/ui/design/tab-button";
import { EmbedFrame } from "@/ui/docs-kit/embed-frame";
import { PatchGraph } from "@/ui/docs-kit/patch-graph";
import { Check, ChevronDown, Link, Play, Square, Waypoints } from "lucide-react";
import { useState } from "react";
import { CodeMirror } from "./code-mirror";
import { EXAMPLES } from "./examples";
import { shareUrlFor } from "./share-url";

interface EditorEmbedProps {
	code: string;
	onChange: (code: string) => void;
	isPlaying: boolean;
	onRun: () => void;
	onStop: () => void;
}

function ExamplesTab({ onPick }: { onPick: (source: string) => void }) {
	const [open, setOpen] = useState(false);
	return (
		<div className="relative">
			<TabButton active={open} title="Load an example" onClick={() => setOpen((o) => !o)}>
				<span className="flex items-center gap-1">
					examples <ChevronDown size={10} />
				</span>
			</TabButton>
			{open && (
				<>
					<button
						type="button"
						aria-label="Close examples menu"
						className="fixed inset-0 z-10 cursor-default"
						onClick={() => setOpen(false)}
					/>
					<div className="absolute left-0 top-full z-20 mt-1 min-w-44 bg-surface-800 border border-surface-700 rounded shadow-lg py-1">
						{EXAMPLES.map((ex) => (
							<button
								key={ex.name}
								type="button"
								className="block w-full text-left px-3 py-1 text-sm text-gray-300 hover:bg-surface-700 hover:text-white"
								onClick={() => {
									onPick(ex.source);
									setOpen(false);
								}}
							>
								{ex.name}
							</button>
						))}
					</div>
				</>
			)}
		</div>
	);
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

export function EditorEmbed({ code, onChange, isPlaying, onRun, onStop }: EditorEmbedProps) {
	const [showGraph, setShowGraph] = useState(false);
	return (
		<EmbedFrame
			tabsLeft={
				<>
					<ExamplesTab
						onPick={(source) => {
							if (isPlaying) onStop();
							onChange(source);
						}}
					/>
					<span className="self-center text-[10px] text-gray-500 pl-2">Ctrl+Enter runs</span>
				</>
			}
			tabsRight={
				<>
					<TabButton
						active={isPlaying}
						title={isPlaying ? "Stop" : "Run (Ctrl+Enter)"}
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
				isPlaying={isPlaying}
				className="text-xs"
			/>
		</EmbedFrame>
	);
}
