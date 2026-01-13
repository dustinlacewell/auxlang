/**
 * Evaluate code and play audio.
 */

import * as api from "../api";
import { getAudioInstance, sendStereoGraph, stopAudio, type AudioInstance } from "../runtime/audio-instance";
import { toWorkletStereoGraph } from "../runtime/to-worklet-graph";
import type { WorkletStereoGraph } from "../runtime/worklet-types";
import { collect } from "./collect";
import { reset } from "./reset";
import { runCode } from "./run-code";
import { expandPoly } from "../graph/expand-poly";
import { compile } from "../runtime/compile";

/**
 * Evaluate code and return stereo worklet graph.
 */
export async function evalToStereo(code: string): Promise<WorkletStereoGraph> {
	reset();
	runCode(code, api);

	const graph = collect();
	const stereoGraph = expandPoly(graph);
	const stereo = compile(stereoGraph);
	return toWorkletStereoGraph(stereo);
}

let currentInstance: AudioInstance | null = null;

/**
 * Evaluate code and play audio.
 */
export async function play(code: string): Promise<void> {
	const stereo = await evalToStereo(code);

	if (!currentInstance) {
		currentInstance = await getAudioInstance();
	}

	// Resume context if suspended (browser autoplay policy)
	if (currentInstance.context.state === "suspended") {
		await currentInstance.context.resume();
	}

	sendStereoGraph(currentInstance, stereo);
}

/**
 * Stop audio playback.
 */
export function stop(): void {
	if (currentInstance) {
		stopAudio(currentInstance);
	}
}
