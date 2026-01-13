/**
 * Spread device - distributes poly voices across stereo field.
 *
 * In core2, poly inputs come as arrays of OutputRefs. Spread creates
 * L/R mixer devices that pan each voice and sum to stereo outputs.
 */

import { device } from "../device/device";
import { inputs } from "../device/inputs";
import type { OutputRef } from "../graph/output-ref";
import type { NodeInput } from "../signal/node-input";
import type { WrappedNode } from "../wrap/wrap";

function isOutputRefArray(v: unknown): v is OutputRef[] {
	return Array.isArray(v) && v.length > 0 && typeof v[0] === "object" && "ref" in (v[0] as object);
}

/**
 * Creates an anonymous mixer device for a specific voice count and channel (L or R).
 * The device has inputs: width, v0, v1, ... vN-1
 * Process sums: sum of (voice[i] * gain[i]) where gain is based on pan position.
 */
function createMixer(voiceCount: number, isLeft: boolean) {
	const voiceInputs: Record<string, number> = { width: 1 };
	for (let i = 0; i < voiceCount; i++) {
		voiceInputs[`v${i}`] = 0;
	}

	return device({
		inputs: inputs(voiceInputs),
		outputs: ["val"],
		defaultInput: "v0",
		defaultOutput: "val",
		process(inp) {
			const width = (inp.width as number) ?? 1;
			const n = voiceCount;
			let sum = 0;

			for (let i = 0; i < n; i++) {
				const voice = (inp[`v${i}`] as number) ?? 0;
				const basePan = n === 1 ? 0 : -1 + (2 * i) / (n - 1);
				const pan = basePan * width;
				const gain = isLeft ? (1 - pan) / 2 : (1 + pan) / 2;
				sum += voice * gain;
			}

			return { val: sum };
		},
	});
}

export const spread = device("spread", {
	inputs: inputs({ input: 0, width: 1 }),
	outputs: ["val"],
	defaultInput: "input",
	defaultOutput: "val",
	polyphonic: true,
	process(inp) {
		// Fallback for mono - just pass through
		return { val: (inp.input as number) ?? 0 };
	},
	expand(config, inputBindings) {
		const input = inputBindings.input;
		const width = inputBindings.width ?? 1;

		// Normalize to array of voices
		const voices: NodeInput[] = isOutputRefArray(input) ? input : [input as NodeInput];
		const n = voices.length;

		// Create L and R mixers for this voice count
		const leftMixer = createMixer(n, true);
		const rightMixer = createMixer(n, false);

		// Build input bindings for each mixer
		const mixerInputs: Record<string, NodeInput> = { width };
		for (let i = 0; i < n; i++) {
			mixerInputs[`v${i}`] = voices[i]!;
		}

		// Create the mixer nodes (anonymous devices don't register with builder)
		const leftNode = leftMixer(mixerInputs);
		const rightNode = rightMixer(mixerInputs);

		return [leftNode, rightNode] as [WrappedNode, WrappedNode];
	},
});
