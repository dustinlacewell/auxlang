import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

// PolySignal format: {id: number, value: number}[]
type PolySignal = Array<{ id: number; value: number }>;

/**
 * Counter device - counts triggers and outputs the count.
 */
export const counter = device({
	inputs: inputs({ trig: 0, reset: 0, max: 0 }),
	outputs: ["count", "wrap"],
	defaultInput: "trig",
	defaultOutput: "count",
	process(inp, _cfg, state, _sampleRate) {
		const trigSig = (inp.trig ?? []) as PolySignal;
		const resetSig = (inp.reset ?? []) as PolySignal;
		const maxSig = (inp.max ?? []) as PolySignal;
		const trig = trigSig.length > 0 ? trigSig[0]!.value : 0;
		const reset = resetSig.length > 0 ? resetSig[0]!.value : 0;
		const max = Math.floor(maxSig.length > 0 ? maxSig[0]!.value : 0);

		let count = (state.count as number) ?? 0;
		const wasTrig = (state.wasTrig as number) ?? 0;
		const wasReset = (state.wasReset as number) ?? 0;

		const trigOn = trig > 0.5;
		const trigWasOn = wasTrig > 0.5;
		const trigRising = trigOn && !trigWasOn;

		const resetOn = reset > 0.5;
		const resetWasOn = wasReset > 0.5;
		const resetRising = resetOn && !resetWasOn;

		let wrap = 0;
		if (resetRising) {
			count = 0;
		} else if (trigRising) {
			count = count + 1;
			if (max > 0 && count >= max) {
				count = 0;
				wrap = 1;
			}
		}

		state.count = count;
		state.wasTrig = trig;
		state.wasReset = reset;

		return { count: [{ id: 0, value: count }], wrap: [{ id: 0, value: wrap }] };
	},
});
