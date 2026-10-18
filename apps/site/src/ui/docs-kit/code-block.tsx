/**
 * Editable code block for a doc example. Reuses the app's CodeMirror stack
 * (auxlang theme + the shared extensions) so patches look identical to the
 * editor. `code` is the starting text; the reader's edits are what Run plays.
 * While a `sourceMap` is supplied (the example is the one playing) it carries
 * the same live-feedback extensions as the main editor
 * (editor/code-mirror.tsx): pattern highlight, draggable numbers, and
 * control widgets.
 *
 * Tab buttons sit attached outside the top-right edge: a playback toggle
 * (shown when `onRun` is provided), a reset toggle (shown once the text
 * diverges from the starting `code`, restoring it), and a graph toggle
 * revealing the patch's compiled signal graph (PatchGraph). `graphOpen`
 * starts the graph expanded for examples where the graph is the point.
 * Ctrl+Enter runs the edited text (re-evaluating while playing); Ctrl+.
 * stops.
 */

import type { SlotDecl } from "auxlang/runtime/live/live-contract";
import { EMPTY_SOURCE_MAP, type SourceMap } from "auxlang/source/source-map";
import { auxlangTheme } from "@auxlang/codemirror/auxlang-theme";
import { createExtensions } from "@auxlang/codemirror/extensions";
import { patternHighlightExtension } from "@auxlang/codemirror/live-display/pattern-highlight-extension";
import { scopeWidgetExtension } from "@auxlang/codemirror/live-display/scope-widget-extension";
import {
	controlWidgetExtension,
	setLiveProgram,
} from "@auxlang/codemirror/live-input/control-widget-extension";
import { numberDragExtension } from "@auxlang/codemirror/live-input/number-drag-extension";
import { attachModuleHover } from "@auxlang/codemirror/module-highlight";
import { categoryColors } from "@/ui/design/colors";
import { TabButton } from "@/ui/design/tab-button";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { Play, RotateCcw, Square, Waypoints } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { EmbedFrame } from "./embed-frame";
import { ModuleCard } from "./module-card";
import { PatchGraph } from "./patch-graph";

interface CodeBlockProps {
	code: string;
	/** Start with the signal graph expanded. */
	graphOpen?: boolean;
	/** Playback state for the toggle tab; only meaningful with onRun. */
	playing?: boolean;
	/** Plays the current (edited) text. When provided, a playback toggle tab appears. */
	onRun?: (code: string) => void;
	onStop?: () => void;
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
	onRun,
	onStop,
	sourceMap = EMPTY_SOURCE_MAP,
	liveSlots = [],
	onEnsureSlotSite,
}: CodeBlockProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const viewRef = useRef<EditorView | null>(null);
	const [text, setText] = useState(code);
	const [showGraph, setShowGraph] = useState(graphOpen);
	const [hover, setHover] = useState<{ name: string; x: number; y: number } | null>(null);
	const onRunRef = useRef(onRun);
	onRunRef.current = onRun;
	const onStopRef = useRef(onStop);
	onStopRef.current = onStop;
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
		setText(code);
		const state = EditorState.create({
			doc: code,
			extensions: [
				...createExtensions(categoryColors),
				auxlangTheme,
				keymap.of([
					{
						key: "Mod-Enter",
						run: (v) => {
							onRunRef.current?.(v.state.doc.toString());
							return true;
						},
					},
					{
						key: "Mod-.",
						run: () => {
							onStopRef.current?.();
							return true;
						},
					},
				]),
				EditorView.updateListener.of((update) => {
					if (update.docChanged) setText(update.state.doc.toString());
				}),
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

	const dirty = text !== code;

	return (
		<EmbedFrame
			tabsRight={
				<>
					{onRun && (
						<TabButton
							active={playing}
							title={playing ? "Stop (Ctrl+.)" : "Run (Ctrl+Enter)"}
							onClick={() => (playing ? onStop?.() : onRun(text))}
						>
							{playing ? <Square size={12} className="text-white" /> : <Play size={12} />}
						</TabButton>
					)}
					{dirty && (
						<TabButton
							title="Reset to original"
							onClick={() => {
								const view = viewRef.current;
								if (!view) return;
								view.dispatch({
									changes: { from: 0, to: view.state.doc.length, insert: code },
								});
								setText(code);
							}}
						>
							<RotateCcw size={12} />
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
			panel={showGraph ? <PatchGraph code={text} /> : undefined}
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
