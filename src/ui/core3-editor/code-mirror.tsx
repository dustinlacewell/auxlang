/**
 * A plain CodeMirror surface for core3: the shared aux theme + extensions,
 * a Mod-Enter run keymap, and controlled value sync. This editor drives
 * audio through the core3 eval path.
 */

import type { SlotDecl } from "@/core3/runtime/live/live-contract";
import { EMPTY_SOURCE_MAP, type SourceMap } from "@/core3/source/source-map";
import { auxlangTheme } from "@/ui/code-editor/auxlang-theme";
import { createExtensions } from "@/ui/code-editor/extensions";
import { attachModuleHover } from "@/ui/code-editor/module-highlight";
import { ModuleCard } from "@/ui/docs-kit/module-card";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { patternHighlightExtension } from "@/ui/code-editor/live-display/pattern-highlight-extension";
import { scopeWidgetExtension } from "@/ui/code-editor/live-display/scope-widget-extension";
import {
	controlWidgetExtension,
	setLiveProgram,
} from "@/ui/code-editor/live-input/control-widget-extension";
import { numberDragExtension } from "@/ui/code-editor/live-input/number-drag-extension";

interface CodeMirrorProps {
	value: string;
	onChange: (value: string) => void;
	onRun: () => void;
	onStop: () => void;
	/** The last successful eval's location tables; read live by the pattern-highlight/live-input extensions. */
	sourceMap: SourceMap;
	/** Display slots for the control widgets: the preview eval's while stopped, the playing program's while playing. */
	liveSlots: readonly SlotDecl[];
	isPlaying: boolean;
	/** Turns a dragged number literal's site into a live slot (live-input/number-drag-extension.ts). */
	ensureSlotSite: (site: number) => Promise<void>;
	className?: string;
}

export function CodeMirror({
	value,
	onChange,
	onRun,
	onStop,
	sourceMap,
	liveSlots,
	isPlaying,
	ensureSlotSite,
	className = "",
}: CodeMirrorProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const viewRef = useRef<EditorView | null>(null);
	const onChangeRef = useRef(onChange);
	const onRunRef = useRef(onRun);
	const onStopRef = useRef(onStop);
	const sourceMapRef = useRef<SourceMap>(EMPTY_SOURCE_MAP);
	const liveSlotsRef = useRef<readonly SlotDecl[]>(liveSlots);
	const isPlayingRef = useRef(isPlaying);
	const ensureSlotSiteRef = useRef(ensureSlotSite);
	const [hover, setHover] = useState<{ name: string; x: number; y: number } | null>(null);

	onChangeRef.current = onChange;
	onRunRef.current = onRun;
	onStopRef.current = onStop;
	sourceMapRef.current = sourceMap;
	liveSlotsRef.current = liveSlots;
	isPlayingRef.current = isPlaying;
	ensureSlotSiteRef.current = ensureSlotSite;

	useEffect(() => {
		if (!containerRef.current) return;

		// Run re-evaluates while playing (a swap, no gap); stop has its own key.
		const runKeymap = keymap.of([
			{
				key: "Mod-Enter",
				run: () => {
					onRunRef.current();
					return true;
				},
			},
			{
				key: "Mod-.",
				run: () => {
					onStopRef.current();
					return true;
				},
			},
		]);
		const updateListener = EditorView.updateListener.of((update) => {
			if (update.docChanged) onChangeRef.current(update.state.doc.toString());
		});

		const view = new EditorView({
			state: EditorState.create({
				doc: value,
				extensions: [
					...createExtensions(),
					auxlangTheme,
					runKeymap,
					updateListener,
					patternHighlightExtension(() => sourceMapRef.current),
					scopeWidgetExtension(() => sourceMapRef.current),
					numberDragExtension({
						sourceMapOf: () => sourceMapRef.current,
						ensureSlotSite: (site) => ensureSlotSiteRef.current(site),
					}),
					controlWidgetExtension({
						sourceMapOf: () => sourceMapRef.current,
						slotsOf: () => liveSlotsRef.current,
						isPlaying: () => isPlayingRef.current,
					}),
				],
			}),
			parent: containerRef.current,
		});
		viewRef.current = view;
		const detachHover = attachModuleHover(view, setHover);
		return () => {
			detachHover();
			view.destroy();
		};
		// Mount once; value changes are synced below.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		const view = viewRef.current;
		if (view && view.state.doc.toString() !== value) {
			view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
		}
	}, [value]);

	// A new sourceMap/liveSlots pair (a silent eval or a played program's)
	// arrives outside any doc transaction — tell the view so the control
	// widgets rebuild now, not on the next edit/focus.
	useEffect(() => {
		viewRef.current?.dispatch({ effects: setLiveProgram.of(undefined) });
	}, [sourceMap, liveSlots]);

	return (
		<>
			<div ref={containerRef} className={`overflow-auto ${className}`} />
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
		</>
	);
}
