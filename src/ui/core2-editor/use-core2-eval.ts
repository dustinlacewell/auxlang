/**
 * Hook for evaluating code with core2 and getting graph stages + audio.
 */

import { useCallback, useState } from "react";
import * as api from "@/core2/api";
import { evalToStages, type EvalResult } from "@/core2/eval/pipeline";
import { play, stop } from "@/core2/eval/play";
import { graphToDot } from "@/core2/viz/graph-to-dot";

type PlaybackState = "idle" | "playing" | "error";

interface Core2EvalState {
	result: EvalResult | null;
	error: string | null;
	rawDot: string | null;
	expandedDot: string | null;
	playbackState: PlaybackState;
}

export function useCore2Eval() {
	const [state, setState] = useState<Core2EvalState>({
		result: null,
		error: null,
		rawDot: null,
		expandedDot: null,
		playbackState: "idle",
	});

	const evaluate = useCallback(async (code: string) => {
		try {
			// Get graph stages for visualization
			const result = evalToStages(code, api);
			const rawDot = graphToDot(result.graph, "FlatGraph (raw)");
			const expandedDot = graphToDot(result.expanded, "FlatGraph (expanded)");

			setState({
				result,
				error: null,
				rawDot,
				expandedDot,
				playbackState: "playing",
			});

			// Play audio
			await play(code);
		} catch (err) {
			setState((prev) => ({
				...prev,
				result: null,
				error: String(err),
				rawDot: null,
				expandedDot: null,
				playbackState: "error",
			}));
		}
	}, []);

	const stopPlayback = useCallback(() => {
		stop();
		setState((prev) => ({ ...prev, playbackState: "idle" }));
	}, []);

	return { ...state, evaluate, stopPlayback };
}
