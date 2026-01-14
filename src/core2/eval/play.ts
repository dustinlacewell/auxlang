/**
 * Evaluate code and play audio.
 */

import * as api from "../api";
import { getAudioInstance, sendStereoGraph, stopAudio, stopGraph, type AudioInstance } from "../runtime/audio-instance";
import { toWorkletStereoGraph } from "../runtime/to-worklet-graph";
import type { WorkletStereoGraph } from "../runtime/worklet-types";
import { collect } from "./collect";
import { reset } from "./reset";
import { runCode } from "./run-code";
import { expandPoly } from "../graph/expand-poly";
import { compile } from "../runtime/compile";
import { createSourceMap, setCurrentSourceMap, type SourceMap } from "./source-map";

/**
 * Evaluate code and return stereo worklet graph.
 */
export async function evalToStereo(code: string, sourceMap?: SourceMap): Promise<WorkletStereoGraph> {
	reset();
	
	if (sourceMap) {
		setCurrentSourceMap(sourceMap);
	}
	
	try {
		runCode(code, api);
		const graph = collect();
		const stereoGraph = expandPoly(graph);
		const stereo = compile(stereoGraph);
		return toWorkletStereoGraph(stereo);
	} finally {
		setCurrentSourceMap(null);
	}
}

let currentInstance: AudioInstance | null = null;

/**
 * Evaluate code and play audio with visualization support.
 */
export async function playWithVisualization(
	code: string,
	graphId: string,
	sourceMap?: SourceMap
): Promise<void> {
	const map = sourceMap || createSourceMap(code);
	const stereo = await evalToStereo(code, map);

	if (!currentInstance) {
		currentInstance = await getAudioInstance();
	}

	if (currentInstance.context.state === "suspended") {
		await currentInstance.context.resume();
	}

	sendStereoGraph(currentInstance, stereo, map, graphId);
}

/**
 * Evaluate code and play audio (simple API without visualization).
 */
export async function play(code: string): Promise<void> {
	const graphId = "default";
	await playWithVisualization(code, graphId);
}

/**
 * Stop a specific graph.
 */
export function stopGraphById(graphId: string): void {
	if (currentInstance) {
		stopGraph(currentInstance, graphId);
	}
}

/**
 * Stop all audio playback.
 */
export function stop(): void {
	if (currentInstance) {
		stopAudio(currentInstance);
	}
}
