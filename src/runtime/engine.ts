import type { Graph } from "../graph/types";
import { compile } from "./compile";
import type { WorkletMessage } from "./types";

export interface Engine {
	start(): Promise<void>;
	stop(): void;
	setGraph(graph: Graph): Promise<void>;
}

/**
 * Create an audio engine that runs graphs in an AudioWorklet.
 */
export function createEngine(workletUrl: string): Engine {
	let audioContext: AudioContext | null = null;
	let workletNode: AudioWorkletNode | null = null;

	return {
		async start() {
			if (audioContext) return;

			audioContext = new AudioContext();
			await audioContext.audioWorklet.addModule(workletUrl);

			workletNode = new AudioWorkletNode(audioContext, "graph-processor");
			workletNode.connect(audioContext.destination);
		},

		stop() {
			if (workletNode) {
				const message: WorkletMessage = { type: "stop" };
				workletNode.port.postMessage(message);
				workletNode.disconnect();
				workletNode = null;
			}

			if (audioContext) {
				audioContext.close();
				audioContext = null;
			}
		},

		async setGraph(graph: Graph) {
			if (!workletNode) {
				throw new Error("Engine not started");
			}

			const compiled = await compile(graph);
			const message: WorkletMessage = { type: "setGraph", graph: compiled };
			workletNode.port.postMessage(message);
		},
	};
}
