/**
 * Pan - stereo panner that mixes down to mono then outputs L/R pair.
 *
 * Sums all input voices to mono, then applies panning to output 2 voices (L/R).
 *
 * Inputs:
 *   input: signal - audio input (mono or poly, gets summed)
 *   pan: number (default: 0) - position (-1=L, 0=center, 1=R)
 *
 * Outputs:
 *   signal: panned output (always 2 voices: L, R)
 */

import { device } from "../device/device";
import type { OutputRef } from "../graph/output-ref";
import type { NodeInput } from "../signal/node-input";
import type { WrappedNode } from "../wrap/wrap";

function isOutputRefArray(v: unknown): v is OutputRef[] {
	return Array.isArray(v) && v.length > 0 && typeof v[0] === "object" && "ref" in (v[0] as object);
}

/**
 * Creates an anonymous mixer device that sums N voices to mono.
 *
 * NOTE: voiceCount must be passed via config, not closure, because
 * process functions are serialized to the worklet where closures aren't available.
 */
function createSummer(voiceCount: number) {
	const voiceInputs: Record<string, number> = {};
	for (let i = 0; i < voiceCount; i++) {
		voiceInputs[`v${i}`] = 0;
	}

	return device({
		inputs: voiceInputs,
		outputs: ["signal"],
		defaultInput: "v0",
		defaultOutput: "signal",
		config: { voiceCount },
		process(inp, cfg, _state, _sampleRate, _time, out) {
			const n = cfg.voiceCount as number;
			let sum = 0;
			for (let i = 0; i < n; i++) {
				sum += (inp[`v${i}`] as number) ?? 0;
			}
			out.signal = sum;
		},
	});
}

/** Anonymous device for left channel panning */
const panLeft = device({
	inputs: { input: 0, pan: 0 },
	outputs: ["signal"],
	defaultInput: "input",
	defaultOutput: "signal",
	process(inp, _cfg, _state, _sampleRate, _time, out) {
		const input = inp.input
		const p = inp.pan
		// leftGain = (1 - pan) / 2
		const gain = (1 - p) / 2;
		out.signal = input * gain;
	},
});

/** Anonymous device for right channel panning */
const panRight = device({
	inputs: { input: 0, pan: 0 },
	outputs: ["signal"],
	defaultInput: "input",
	defaultOutput: "signal",
	process(inp, _cfg, _state, _sampleRate, _time, out) {
		const input = inp.input
		const p = inp.pan
		// rightGain = (1 + pan) / 2
		const gain = (1 + p) / 2;
		out.signal = input * gain;
	},
});

export const pan = device("pan", {
	inputs: { input: 0, pan: 0 },
	outputs: ["signal"],
	defaultInput: "input",
	defaultOutput: "signal",
	polyphonic: true,
	process(inp, _cfg, _state, _sampleRate, _time, out) {
		// Fallback for when expand isn't used
		out.signal = inp.input
	},
	expand(_config, inputBindings) {
		const input = inputBindings.input;
		const panInput = inputBindings.pan ?? 0;

		// Get mono signal - sum if poly
		let mono: NodeInput;
		if (isOutputRefArray(input)) {
			if (input.length === 1) {
				mono = input[0]!;
			} else {
				// Create a summer for N voices
				const summer = createSummer(input.length);
				const summerInputs: Record<string, NodeInput> = {};
				for (let i = 0; i < input.length; i++) {
					summerInputs[`v${i}`] = input[i]!;
				}
				const sumNode = summer(summerInputs);
				mono = { ref: sumNode.id, out: "signal" };
			}
		} else {
			mono = input as NodeInput;
		}

		// Create L and R channel nodes
		const leftNode = panLeft({ input: mono, pan: panInput });
		const rightNode = panRight({ input: mono, pan: panInput });

		return [leftNode, rightNode] as [WrappedNode, WrappedNode];
	},
});
