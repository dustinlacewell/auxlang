import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

/**
 * Sample and Hold - captures input value on trigger.
 *
 * Samples the input signal on the rising edge of the trigger
 * and holds that value until the next trigger.
 *
 * Inputs:
 * - `input`: Signal to sample
 * - `trig`: Trigger signal (samples on rising edge > 0.5)
 *
 * @example
 * ```javascript
 * sah(noise()).trig(clock.trig)        // Random value each beat
 * sah(lfo).trig(seq.gate)              // Sample LFO on note events
 * ```
 */
export const sah = device({
	inputs: inputs({ input: 0, trig: 0 }),
	outputs: ["out"],
	defaultInput: "input",
	defaultOutput: "out",
	process(inp, _cfg, state, _sampleRate) {
		const inputSig = inp.input ?? [0];
		const trigs = inp.trig ?? [0];
		const numChannels = Math.max(inputSig.length, trigs.length);

		if (!state.helds) state.helds = [];
		if (!state.wasTrigs) state.wasTrigs = [];
		const helds = state.helds as number[];
		const wasTrigs = state.wasTrigs as number[];

		const out: number[] = [];
		for (let c = 0; c < numChannels; c++) {
			const input = inputSig[c % inputSig.length] ?? 0;
			const trig = trigs[c % trigs.length] ?? 0;

			const held = helds[c] ?? input;
			const wasTrig = wasTrigs[c] ?? 0;

			const trigOn = trig > 0.5;
			const trigWasOn = wasTrig > 0.5;
			const risingEdge = trigOn && !trigWasOn;

			const newHeld = risingEdge ? input : held;

			helds[c] = newHeld;
			wasTrigs[c] = trig;
			out.push(newHeld);
		}

		return { out };
	},
});
