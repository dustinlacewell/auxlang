import type { Graph } from "@/graph/types";
import type { StereoGraph } from "@/graph/out";
import { compile } from "@/runtime/compile";
import type { WorkletMessage } from "@/runtime/types";
import type { AudioInstance } from "./types";

const processorUrl = new URL("../../runtime/worklet/index.ts", import.meta.url).href;

export async function createAudioInstance(): Promise<AudioInstance> {
	const ctx = new AudioContext();
	// Resume context (required for user-initiated audio)
	await ctx.resume();
	await ctx.audioWorklet.addModule(processorUrl);
	const node = new AudioWorkletNode(ctx, "graph-processor", {
		outputChannelCount: [2], // Stereo output
	});
	node.connect(ctx.destination);
	return { ctx, node };
}

export function stopInstance(instance: AudioInstance): void {
	const message: WorkletMessage = { type: "stop" };
	instance.node.port.postMessage(message);
	instance.node.disconnect();
	instance.ctx.close();
}

export async function sendGraph(instance: AudioInstance, graph: Graph): Promise<void> {
	const compiled = await compile(graph);
	const message: WorkletMessage = { type: "setGraph", graph: compiled };
	instance.node.port.postMessage(message);
}

export async function sendStereoGraph(instance: AudioInstance, stereo: StereoGraph): Promise<void> {
	const [left, right] = await Promise.all([compile(stereo.left), compile(stereo.right)]);
	const message: WorkletMessage = { type: "setStereoGraph", stereo: { left, right } };
	instance.node.port.postMessage(message);
}
