/**
 * A plain CodeMirror surface for core3: the shared aux theme + extensions,
 * a Mod-Enter run keymap, and controlled value sync. No core2 visualization
 * coupling (that lives in code-editor/visualization-state.ts, which is
 * core2-only) — this editor drives audio through the core3 eval path.
 */

import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { useEffect, useRef } from "react";
import { auxlangTheme } from "@/ui/code-editor/auxlang-theme";
import { createExtensions } from "@/ui/code-editor/extensions";

interface CodeMirrorProps {
	value: string;
	onChange: (value: string) => void;
	onRun: () => void;
	className?: string;
}

export function CodeMirror({ value, onChange, onRun, className = "" }: CodeMirrorProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const viewRef = useRef<EditorView | null>(null);
	const onChangeRef = useRef(onChange);
	const onRunRef = useRef(onRun);

	onChangeRef.current = onChange;
	onRunRef.current = onRun;

	useEffect(() => {
		if (!containerRef.current) return;

		const runKeymap = keymap.of([
			{ key: "Mod-Enter", run: () => (onRunRef.current(), true) },
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
		return () => view.destroy();
		// Mount once; value changes are synced below.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		const view = viewRef.current;
		if (view && view.state.doc.toString() !== value) {
			view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
		}
	}, [value]);

	return <div ref={containerRef} className={`overflow-auto ${className}`} />;
}
