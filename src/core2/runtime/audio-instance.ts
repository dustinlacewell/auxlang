/**
 * Core2 audio instance - manages AudioContext and worklet communication.
 */

import type { WorkletMessage, WorkletStereoGraph } from "./worklet-types";

// @ts-expect-error - Vite handles ?url imports
import workletUrl from "./worklet/index.ts?url";

export interface AudioInstance {
	context: AudioContext;
	node: AudioWorkletNode;
}

let instance: AudioInstance | null = null;

export async function getAudioInstance(): Promise<AudioInstance> {
	if (instance) {
		return instance;
	}

	const context = new AudioContext();
	await context.audioWorklet.addModule(workletUrl);

	const node = new AudioWorkletNode(context, "core2-processor", {
		numberOfInputs: 0,
		numberOfOutputs: 1,
		outputChannelCount: [2],
	});

	node.connect(context.destination);

	instance = { context, node };
	return instance;
}

export function sendStereoGraph(inst: AudioInstance, stereo: WorkletStereoGraph): void {
	const message: WorkletMessage = { type: "setStereoGraph", stereo };
	inst.node.port.postMessage(message);
}

export function stopAudio(inst: AudioInstance): void {
	const message: WorkletMessage = { type: "stop" };
	inst.node.port.postMessage(message);
}
