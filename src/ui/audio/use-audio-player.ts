import { resetIdCounter } from "@/descriptor/identity";
import { clearRegistry } from "@/descriptor/registry";
import * as api from "@/editor/api";
import { clearOutputs, collectStereoGraph } from "@/graph/out";
import { useCallback, useRef, useState } from "react";
import { createAudioInstance, sendStereoGraph, stopInstance } from "./create-audio-instance";
import type { AudioInstance, PlaybackState } from "./types";

export function useAudioPlayer() {
	const [state, setState] = useState<PlaybackState>("idle");
	const [error, setError] = useState<string | null>(null);
	const instanceRef = useRef<AudioInstance | null>(null);

	const play = useCallback(async (code: string) => {
		// Reset descriptor state (needed for fresh ID generation)
		resetIdCounter();
		clearRegistry();
		clearOutputs();

		try {
			// Evaluate code - out() calls register signals, no return needed
			const fn = new Function(...Object.keys(api), code);
			fn(...Object.values(api));

			// Collect all registered outputs into stereo graphs
			const stereo = collectStereoGraph();
			if (!stereo) {
				setState("error");
				setError("No out() calls in code");
				return;
			}

			// Create audio instance if needed (reuse existing for live re-eval)
			if (!instanceRef.current) {
				const instance = await createAudioInstance();
				instanceRef.current = instance;
			}

			// Send stereo graphs (processor handles state preservation for matched nodes)
			await sendStereoGraph(instanceRef.current, stereo);
			setState("playing");
			setError(null);
		} catch (err) {
			setState("error");
			setError(String(err));
		}
	}, []);

	const stop = useCallback(() => {
		if (instanceRef.current) {
			stopInstance(instanceRef.current);
			instanceRef.current = null;
		}
		setState("idle");
	}, []);

	return { state, error, play, stop };
}
