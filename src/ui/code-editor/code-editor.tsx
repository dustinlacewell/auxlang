import { useRef, useEffect } from "react";
import { EditorView, keymap } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { createExtensions } from "./extensions";
import { auxlangTheme } from "./auxlang-theme";

interface CodeEditorProps {
	value: string;
	onChange: (value: string) => void;
	onRun?: () => void;
	className?: string;
}

export function CodeEditor({
	value,
	onChange,
	onRun,
	className = "",
}: CodeEditorProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const viewRef = useRef<EditorView | null>(null);
	const onChangeRef = useRef(onChange);
	const onRunRef = useRef(onRun);

	// Keep refs up to date
	onChangeRef.current = onChange;
	onRunRef.current = onRun;

	useEffect(() => {
		if (!containerRef.current) return;

		const runKeymap = keymap.of([
			{
				key: "Mod-Enter",
				run: () => {
					onRunRef.current?.();
					return true;
				},
			},
		]);

		const updateListener = EditorView.updateListener.of((update) => {
			if (update.docChanged) {
				onChangeRef.current(update.state.doc.toString());
			}
		});

		const state = EditorState.create({
			doc: value,
			extensions: [
				...createExtensions(),
				auxlangTheme,
				runKeymap,
				updateListener,
			],
		});

		const view = new EditorView({
			state,
			parent: containerRef.current,
		});

		viewRef.current = view;

		return () => {
			view.destroy();
		};
		// Only mount once - value changes handled separately
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Sync external value changes (e.g., loading a different file)
	useEffect(() => {
		const view = viewRef.current;
		if (view && view.state.doc.toString() !== value) {
			view.dispatch({
				changes: { from: 0, to: view.state.doc.length, insert: value },
			});
		}
	}, [value]);

	return (
		<div
			ref={containerRef}
			className={`border border-surface-700 rounded overflow-hidden [&_.cm-editor]:h-full [&_.cm-scroller]:overflow-auto ${className}`}
		/>
	);
}
