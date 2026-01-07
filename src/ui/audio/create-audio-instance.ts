import type { Graph } from "@/graph/types";
import { compile } from "@/runtime/compile";
import type { WorkletMessage } from "@/runtime/types";
import type { AudioInstance } from "./types";

const processorUrl = new URL("../../runtime/processor.ts", import.meta.url).href;

export async function createAudioInstance(): Promise<AudioInstance> {
	const ctx = new AudioContext();
	await ctx.audioWorklet.addModule(processorUrl);
	const node = new AudioWorkletNode(ctx, "graph-processor");
	node.connect(ctx.destination);
	return { ctx, node };
}

export function stopInstance(instance: AudioInstance): void {
	const message: WorkletMessage = { type: "stop" };
	instance.node.port.postMessage(message);
	instance.node.disconnect();
	instance.ctx.close();
}

export function sendGraph(instance: AudioInstance, graph: Graph): void {
	const compiled = compile(graph);
	const message: WorkletMessage = { type: "setGraph", graph: compiled };
	instance.node.port.postMessage(message);
}
