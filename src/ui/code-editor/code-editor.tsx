import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { useEffect, useRef } from "react";
import { auxlangTheme } from "./auxlang-theme";
import { createExtensions } from "./extensions";
import {
	visualizationUpdateEffect,
	visualizationStateExtension,
	type ActiveNote,
	type ActiveDevice,
} from "./visualization-state";
import { getAudioInstance, onVisualizationUpdate, type NoteDecoration } from "../../core2/runtime/audio-instance";
import type { SourcePosition } from "../../core2/eval/source-map";

interface CodeEditorProps {
	value: string;
	onChange: (value: string) => void;
	onRun?: () => void;
	className?: string;
	graphId?: string;
}

export function CodeEditor({ value, onChange, onRun, className = "", graphId }: CodeEditorProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const viewRef = useRef<EditorView | null>(null);
	const onChangeRef = useRef(onChange);
	const onRunRef = useRef(onRun);
	const graphIdRef = useRef(graphId);

	// Keep refs up to date
	onChangeRef.current = onChange;
	onRunRef.current = onRun;
	graphIdRef.current = graphId;

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
			extensions: [...createExtensions(), auxlangTheme, runKeymap, updateListener, visualizationStateExtension],
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

	useEffect(() => {
		if (!graphId || !viewRef.current) return;

		let unsubscribe: (() => void) | undefined;

		getAudioInstance().then((audioInstance) => {
			unsubscribe = onVisualizationUpdate(audioInstance, graphId, (intensities, notes) => {
				const view = viewRef.current;
				if (!view) return;

				// Convert NoteDecoration[] to ActiveNote[] (absolute positions with kind)
				const activeNotes: ActiveNote[] = notes?.map(n => ({ 
					from: n.start, 
					to: n.end, 
					kind: n.kind ?? "note" 
				})) ?? [];

				// Convert SourcePosition -> intensity map to ActiveDevice[]
				const activeDevices: ActiveDevice[] = [];
				for (const [pos, intensity] of intensities) {
					activeDevices.push({ from: pos.start, to: pos.end, intensity });
				}

				view.dispatch({
					effects: visualizationUpdateEffect.of({ activeNotes, activeDevices }),
				});
			});
		}).catch(console.error);

		return () => {
			unsubscribe?.();
		};
	}, [graphId]);

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
			className={`border border-surface-700 rounded overflow-auto ${className}`}
		/>
	);
}
