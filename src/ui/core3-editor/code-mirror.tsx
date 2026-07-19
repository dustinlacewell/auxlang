/**
 * A plain CodeMirror surface for core3: the shared aux theme + extensions,
 * a Mod-Enter run keymap, and controlled value sync. No core2 visualization
 * coupling (that lives in code-editor/visualization-state.ts, which is
 * core2-only) — this editor drives audio through the core3 eval path.
 */

import { auxlangTheme } from "@/ui/code-editor/auxlang-theme";
import { createExtensions } from "@/ui/code-editor/extensions";
import { attachModuleHover } from "@/ui/code-editor/module-highlight";
import { ModuleCard } from "@/ui/docs-kit/module-card";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface CodeMirrorProps {
	value: string;
	onChange: (value: string) => void;
	onRun: () => void;
	onStop: () => void;
	isPlaying: boolean;
	className?: string;
}

export function CodeMirror({
	value,
	onChange,
	onRun,
	onStop,
	isPlaying,
	className = "",
}: CodeMirrorProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const viewRef = useRef<EditorView | null>(null);
	const onChangeRef = useRef(onChange);
	const onRunRef = useRef(onRun);
	const onStopRef = useRef(onStop);
	const isPlayingRef = useRef(isPlaying);
	const [hover, setHover] = useState<{ name: string; x: number; y: number } | null>(null);

	onChangeRef.current = onChange;
	onRunRef.current = onRun;
	onStopRef.current = onStop;
	isPlayingRef.current = isPlaying;

	useEffect(() => {
		if (!containerRef.current) return;

		const runKeymap = keymap.of([
			{
				key: "Mod-Enter",
				run: () => (isPlayingRef.current ? onStopRef.current() : onRunRef.current(), true),
			},
		]);
		const updateListener = EditorView.updateListener.of((update) => {
			if (update.docChanged) onChangeRef.current(update.state.doc.toString());
		});

		const view = new EditorView({
			state: EditorState.create({
				doc: value,
				extensions: [...createExtensions(), auxlangTheme, runKeymap, updateListener],
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
