/**
 * Main-thread audio host: owns the AudioContext + AudioWorkletNode pair and
 * the worklet's message port. `play(program)` posts a swap (the worklet
 * crossfades and migrates state); `stop()` silences it. The worklet bundle is
 * loaded via Vite's `?url` import, same mechanism as core2.
 */

import type { Program } from "../types";
import type { WorkletMessage, WorkletReply } from "./worklet/messages";

// @ts-expect-error - Vite handles ?url imports
import workletUrl from "./worklet/index.ts?url";

interface AudioHost {
	readonly context: AudioContext;
	readonly node: AudioWorkletNode;
}

let host: AudioHost | null = null;

async function ensureHost(): Promise<AudioHost> {
	if (host) return host;
	const context = new AudioContext();
	await context.audioWorklet.addModule(workletUrl);
	const node = new AudioWorkletNode(context, "core3-processor", {
		numberOfInputs: 0,
		numberOfOutputs: 1,
		outputChannelCount: [2],
	});
	node.port.onmessage = (e: MessageEvent<WorkletReply>) => {
		if (e.data.type === "error") throw new Error(`core3 worklet: ${e.data.message}`);
	};
	// An exception thrown INSIDE process() (not caught by swap's fence) kills the
	// processor without a message-port reply; surface it loudly instead of
	// letting the audio die in silence.
	node.onprocessorerror = (e: Event) => {
		console.error("core3 worklet: audio processor crashed — audio is dead until re-run", e);
	};
	node.connect(context.destination);
	host = { context, node };
	return host;
}

export async function play(program: Program): Promise<void> {
	const { context, node } = await ensureHost();
	if (context.state === "suspended") await context.resume();
	const message: WorkletMessage = { type: "swap", program };
	node.port.postMessage(message);
}

export function stop(): void {
	if (!host) return;
	const message: WorkletMessage = { type: "stop" };
	host.node.port.postMessage(message);
}
