import { useState, useRef, useCallback, useEffect } from "react";
import * as api from "@/editor/api";
import { resetIdCounter } from "@/descriptor/identity";
import { clearRegistry } from "@/descriptor/registry";
import type { Graph } from "@/graph/types";
import {
	createAudioInstance,
	stopInstance,
	sendGraph,
} from "./create-audio-instance";
import type { AudioInstance, PlaybackState } from "./types";

interface InstanceState {
	state: PlaybackState;
	error?: string;
}

export function useAudioInstances() {
	const [states, setStates] = useState<Map<string, InstanceState>>(new Map());
	const instancesRef = useRef<Map<string, AudioInstance>>(new Map());

	const play = useCallback(async (id: string, code: string) => {
		// Stop existing instance for this id
		const existing = instancesRef.current.get(id);
		if (existing) {
			stopInstance(existing);
			instancesRef.current.delete(id);
		}

		// Reset descriptor state
		resetIdCounter();
		clearRegistry();

		try {
			// Evaluate code
			const wrappedCode = code.includes("return") ? code : `return (${code})`;
			const fn = new Function(...Object.keys(api), wrappedCode);
			const result = fn(...Object.values(api));

			// Create audio instance
			const instance = await createAudioInstance();
			instancesRef.current.set(id, instance);

			// Send graph
			if (result && typeof result === "object" && "nodes" in result) {
				sendGraph(instance, result as Graph);
				setStates((prev) => {
					const next = new Map(prev);
					next.set(id, { state: "playing" });
					return next;
				});
			} else {
				setStates((prev) => {
					const next = new Map(prev);
					next.set(id, { state: "error", error: "Code did not return a valid graph" });
					return next;
				});
			}
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
		[states]
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
