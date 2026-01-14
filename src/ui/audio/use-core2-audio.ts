/**
 * React hook for core2 audio - manages multiple audio instances for test suite.
 */

import { playWithVisualization, stopGraphById } from "@/core2/eval/play";
import { useCallback, useState } from "react";
import type { PlaybackState } from "./types";

interface InstanceState {
	state: PlaybackState;
	error?: string;
	graphId?: string;
}

export function useCore2Audio() {
	const [states, setStates] = useState<Map<string, InstanceState>>(new Map());

	const play = useCallback(async (id: string, code: string) => {
		try {
			// Use stable graphId per widget (no timestamp)
			// Don't stop the old graph - let processor handle seamless crossfade
			const graphId = id;
			await playWithVisualization(code, graphId);
			
			setStates((prev) => {
				const next = new Map(prev);
				next.set(id, { state: "playing", graphId });
				return next;
			});
		} catch (err) {
			setStates((prev) => {
				const next = new Map(prev);
				next.set(id, { state: "error", error: String(err) });
				return next;
			});
		}
	}, [states]);

	const stop = useCallback(async (id: string) => {
		const state = states.get(id);
		if (state?.graphId) {
			stopGraphById(state.graphId);
		}
		
		setStates((prev) => {
			const next = new Map(prev);
			next.set(id, { state: "idle" });
			return next;
		});
	}, [states]);

	const stopAll = useCallback(() => {
		for (const [id, state] of states) {
			if (state.graphId) {
				stopGraphById(state.graphId);
			}
		}
		setStates(new Map());
	}, [states]);

	const getState = useCallback(
		(id: string): InstanceState => {
			return states.get(id) ?? { state: "idle" };
		},
		[states],
	);

	return { getState, play, stop, stopAll };
}
