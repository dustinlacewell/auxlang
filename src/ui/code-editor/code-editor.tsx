import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { useEffect, useRef } from "react";
import { auxlangTheme } from "./auxlang-theme";
import { createExtensions } from "./extensions";
import {
	registerElementsEffect,
	clearRegisteredEffect,
	activateElementsEffect,
	updateDevicesEffect,
	visualizationStateExtension,
	type ActiveDevice,
	type RegisteredElement,
} from "./visualization-state";
import {
	getAudioInstance,
	onRegistration,
	onActivation,
	onDeviceUpdate,
} from "../../core2/runtime/audio-instance";

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

	// Two-phase visualization subscription
	useEffect(() => {
		if (!graphId || !viewRef.current) return;

		const unsubscribers: (() => void)[] = [];

		getAudioInstance().then((audioInstance) => {
			const view = viewRef.current;
			if (!view) return;

			// Phase 1: Register all elements at eval time
			const unsubReg = onRegistration(audioInstance, graphId, (elements) => {
				const view = viewRef.current;
				if (!view) return;

				// Convert to RegisteredElement format expected by visualization state
				const registered: RegisteredElement[] = elements.map(e => ({
					id: e.id,
					from: e.from,
					to: e.to,
					kind: e.kind,
				}));

				view.dispatch({
					effects: registerElementsEffect.of(registered),
				});
			});
			unsubscribers.push(unsubReg);

			// Phase 2a: Activate elements per frame
			const unsubAct = onActivation(audioInstance, graphId, (activeIds) => {
				const view = viewRef.current;
				if (!view) return;

				view.dispatch({
					effects: activateElementsEffect.of(activeIds),
				});
			});
			unsubscribers.push(unsubAct);

			// Phase 2b: Update device intensities per frame
			const unsubDev = onDeviceUpdate(audioInstance, graphId, (positions) => {
				const view = viewRef.current;
				if (!view) return;

				const devices: ActiveDevice[] = [];
				for (const [pos, intensity] of positions) {
					devices.push({ from: pos.start, to: pos.end, intensity });
				}

				view.dispatch({
					effects: updateDevicesEffect.of(devices),
				});
			});
			unsubscribers.push(unsubDev);
		}).catch(console.error);

		return () => {
			// Clear decorations when unmounting or graphId changes
			const view = viewRef.current;
			if (view) {
				view.dispatch({
					effects: clearRegisteredEffect.of(undefined),
				});
			}

			for (const unsub of unsubscribers) {
				unsub();
			}
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
