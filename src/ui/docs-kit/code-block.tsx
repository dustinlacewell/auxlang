/**
 * Read-only code display for a doc example. Reuses the app's CodeMirror stack
 * (auxlang theme + the shared extensions) so patches look identical to the
 * playground/editor. Still non-editable by typing, but while a `sourceMap` is
 * supplied (the example is the one playing) it carries the same live-feedback
 * extensions as the main editor (core3-editor/code-mirror.tsx): pattern
 * highlight, draggable numbers, and control widgets — a number drag still
 * edits the doc (CodeMirror's `readOnly` only blocks keyboard/IME input, not
 * programmatic dispatch), so docs examples get the same affordances live.
 *
 * Tab buttons sit attached outside the top-right edge: a playback toggle
 * (shown when `onTogglePlay` is provided) and a graph toggle revealing the
 * patch's compiled signal graph (PatchGraph). `graphOpen` starts the graph
 * expanded for examples where the graph is the point.
 */

import type { SlotDecl } from "@/core3/runtime/live/live-contract";
import { EMPTY_SOURCE_MAP, type SourceMap } from "@/core3/source/source-map";
import { auxlangTheme } from "@/ui/code-editor/auxlang-theme";
import { createExtensions } from "@/ui/code-editor/extensions";
import { patternHighlightExtension } from "@/ui/code-editor/live-display/pattern-highlight-extension";
import { scopeWidgetExtension } from "@/ui/code-editor/live-display/scope-widget-extension";
import {
	controlWidgetExtension,
	setLiveProgram,
} from "@/ui/code-editor/live-input/control-widget-extension";
import { numberDragExtension } from "@/ui/code-editor/live-input/number-drag-extension";
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
	/** The playing program's location tables, for pattern highlight/control widgets. Omit for a silent example. */
	sourceMap?: SourceMap | undefined;
	/** The playing program's live slots, for control widgets. */
	liveSlots?: readonly SlotDecl[] | undefined;
	/** Turns a dragged number literal's site into a live slot. Required alongside `sourceMap` for number drag. */
	onEnsureSlotSite?: ((site: number) => Promise<void>) | undefined;
}

export function CodeBlock({
	code,
	graphOpen = false,
	playing = false,
	onTogglePlay,
	sourceMap = EMPTY_SOURCE_MAP,
	liveSlots = [],
	onEnsureSlotSite,
}: CodeBlockProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const viewRef = useRef<EditorView | null>(null);
	const [showGraph, setShowGraph] = useState(graphOpen);
	const [hover, setHover] = useState<{ name: string; x: number; y: number } | null>(null);
	const onTogglePlayRef = useRef(onTogglePlay);
	onTogglePlayRef.current = onTogglePlay;
	const sourceMapRef = useRef(sourceMap);
	sourceMapRef.current = sourceMap;
	const liveSlotsRef = useRef(liveSlots);
	liveSlotsRef.current = liveSlots;
	const playingRef = useRef(playing);
	playingRef.current = playing;
	const onEnsureSlotSiteRef = useRef(onEnsureSlotSite);
	onEnsureSlotSiteRef.current = onEnsureSlotSite;

	useEffect(() => {
		if (!containerRef.current) return;
		const state = EditorState.create({
			doc: code,
			extensions: [
				...createExtensions(),
				auxlangTheme,
				EditorState.readOnly.of(true),
				keymap.of([{ key: "Mod-Enter", run: () => (onTogglePlayRef.current?.(), true) }]),
				patternHighlightExtension(() => sourceMapRef.current),
				scopeWidgetExtension(() => sourceMapRef.current),
				numberDragExtension({
					sourceMapOf: () => sourceMapRef.current,
					ensureSlotSite: (site) => onEnsureSlotSiteRef.current?.(site) ?? Promise.resolve(),
				}),
				controlWidgetExtension({
					sourceMapOf: () => sourceMapRef.current,
					slotsOf: () => liveSlotsRef.current,
					isPlaying: () => playingRef.current,
				}),
			],
		});
		const view = new EditorView({ state, parent: containerRef.current });
		viewRef.current = view;
		const detachHover = attachModuleHover(view, setHover);
		return () => {
			detachHover();
			view.destroy();
		};
	}, [code]);

	// A new sourceMap/liveSlots pair arrives outside any doc transaction (a
	// fresh Run) — tell the view so control widgets rebuild now.
	useEffect(() => {
		viewRef.current?.dispatch({ effects: setLiveProgram.of(undefined) });
	}, [sourceMap, liveSlots]);

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
