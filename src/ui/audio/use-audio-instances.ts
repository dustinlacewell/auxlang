import { resetIdCounter } from "@/descriptor/identity";
import { clearRegistry } from "@/descriptor/registry";
import * as api from "@/editor/api";
import { clearOutputs, collectGraph } from "@/graph/out";
import { useCallback, useEffect, useRef, useState } from "react";
import { createAudioInstance, sendGraph, stopInstance } from "./create-audio-instance";
import type { AudioInstance, PlaybackState } from "./types";

interface InstanceState {
	state: PlaybackState;
	error?: string;
}

export function useAudioInstances() {
	const [states, setStates] = useState<Map<string, InstanceState>>(new Map());
	const instancesRef = useRef<Map<string, AudioInstance>>(new Map());

	const play = useCallback(async (id: string, code: string) => {
		// Reset descriptor state (needed for fresh ID generation)
		resetIdCounter();
		clearRegistry();
		clearOutputs();

		try {
			// Evaluate code - out() calls register signals
			const fn = new Function(...Object.keys(api), code);
			fn(...Object.values(api));

			// Collect all registered outputs into a graph
			const graph = collectGraph();
			if (!graph) {
				setStates((prev) => {
					const next = new Map(prev);
					next.set(id, { state: "error", error: "No out() calls in code" });
					return next;
				});
				return;
			}

			// Reuse existing instance for smooth re-evaluation (no clicks)
			let instance = instancesRef.current.get(id);
			if (!instance) {
				instance = await createAudioInstance();
				instancesRef.current.set(id, instance);
			}

			// Send graph (processor handles state preservation for matched nodes)
			await sendGraph(instance, graph);
			setStates((prev) => {
				const next = new Map(prev);
				next.set(id, { state: "playing" });
				return next;
			});
		} catch (err) {
			setStates((prev) => {
				const next = new Map(prev);
				next.set(id, { state: "error", error: String(err) });
				return next;
			});
		}
	}, []);

	const stop = useCallback((id: string) => {
		const instance = instancesRef.current.get(id);
		if (instance) {
			stopInstance(instance);
			instancesRef.current.delete(id);
		}
		setStates((prev) => {
			const next = new Map(prev);
			next.set(id, { state: "idle" });
			return next;
		});
	}, []);

	const stopAll = useCallback(() => {
		for (const [id, instance] of instancesRef.current) {
			stopInstance(instance);
		}
		instancesRef.current.clear();
		setStates(new Map());
	}, []);

	const getState = useCallback(
		(id: string): InstanceState => {
			return states.get(id) ?? { state: "idle" };
		},
		[states],
	);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			for (const instance of instancesRef.current.values()) {
				stopInstance(instance);
			}
		};
	}, []);

	return { getState, play, stop, stopAll };
}
