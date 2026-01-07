import { useState, useRef, useCallback } from "react";
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

export function useAudioPlayer() {
	const [state, setState] = useState<PlaybackState>("idle");
	const [error, setError] = useState<string | null>(null);
	const instanceRef = useRef<AudioInstance | null>(null);

	const play = useCallback(async (code: string) => {
		// Stop existing instance
		if (instanceRef.current) {
			stopInstance(instanceRef.current);
			instanceRef.current = null;
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
			instanceRef.current = instance;

			// Send graph
			if (result && typeof result === "object" && "nodes" in result) {
				sendGraph(instance, result as Graph);
				setState("playing");
				setError(null);
			} else {
				setState("error");
				setError("Code did not return a valid graph");
			}
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
