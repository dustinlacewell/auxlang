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
		const input = inp.input ?? 0;
		const trig = inp.trig ?? 0;

		const held = (state.held as number) ?? input;
		const wasTrig = (state.wasTrig as number) ?? 0;

		const trigOn = trig > 0.5;
		const trigWasOn = wasTrig > 0.5;
		const risingEdge = trigOn && !trigWasOn;

		const newHeld = risingEdge ? input : held;

		state.held = newHeld;
		state.wasTrig = trig;

		return { out: newHeld };
	},
});
