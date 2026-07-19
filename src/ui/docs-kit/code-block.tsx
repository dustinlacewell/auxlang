/**
 * Read-only code display for a doc example. Reuses the app's CodeMirror stack
 * (auxlang theme + the shared extensions) so patches look identical to the
 * playground/editor, just non-editable — these are docs, not an editor.
 *
 * Tab buttons sit attached outside the top-right edge: a playback toggle
 * (shown when `onTogglePlay` is provided) and a graph toggle revealing the
 * patch's compiled signal graph (PatchGraph). `graphOpen` starts the graph
 * expanded for examples where the graph is the point.
 */

import { auxlangTheme } from "@/ui/code-editor/auxlang-theme";
import { createExtensions } from "@/ui/code-editor/extensions";
import { attachModuleHover } from "@/ui/code-editor/module-highlight";
import { TabButton } from "@/ui/design/tab-button";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { Play, Square, Waypoints } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { EmbedFrame } from "./embed-frame";
import { ModuleCard } from "./module-card";
import { PatchGraph } from "./patch-graph";

interface CodeBlockProps {
	code: string;
	/** Start with the signal graph expanded. */
	graphOpen?: boolean;
	/** Playback state for the toggle tab; only meaningful with onTogglePlay. */
	playing?: boolean;
	/** When provided, a playback toggle tab appears (run when idle, stop when playing). */
	onTogglePlay?: () => void;
}

export function CodeBlock({
	code,
	graphOpen = false,
	playing = false,
	onTogglePlay,
}: CodeBlockProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [showGraph, setShowGraph] = useState(graphOpen);
	const [hover, setHover] = useState<{ name: string; x: number; y: number } | null>(null);
	const onTogglePlayRef = useRef(onTogglePlay);
	onTogglePlayRef.current = onTogglePlay;

	useEffect(() => {
		if (!containerRef.current) return;
		const state = EditorState.create({
			doc: code,
			extensions: [
				...createExtensions(),
				auxlangTheme,
				EditorState.readOnly.of(true),
				keymap.of([{ key: "Mod-Enter", run: () => (onTogglePlayRef.current?.(), true) }]),
			],
		});
		const view = new EditorView({ state, parent: containerRef.current });
		const detachHover = attachModuleHover(view, setHover);
		return () => {
			detachHover();
			view.destroy();
		};
	}, [code]);

	return (
		<EmbedFrame
			tabsRight={
				<>
					{onTogglePlay && (
						<TabButton active={playing} title={playing ? "Stop" : "Run"} onClick={onTogglePlay}>
							{playing ? <Square size={12} className="text-white" /> : <Play size={12} />}
						</TabButton>
					)}
					<TabButton
						active={showGraph}
						title="Signal graph"
						onClick={() => setShowGraph((s) => !s)}
					>
						<Waypoints size={12} />
					</TabButton>
				</>
			}
			panel={showGraph ? <PatchGraph code={code} /> : undefined}
		>
			<div ref={containerRef} />
			{hover &&
				createPortal(
					<div
						className="fixed z-50 pointer-events-none w-72 shadow-lg"
						style={{
							left: Math.min(hover.x + 12, window.innerWidth - 320),
							top: hover.y,
							transform:
								hover.y < window.innerHeight / 2
									? "translateY(14px)"
									: "translateY(calc(-100% - 14px))",
						}}
					>
						<ModuleCard name={hover.name} />
					</div>,
					document.body,
				)}
		</EmbedFrame>
	);
}
