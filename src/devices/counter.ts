import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

/**
 * Counter device - counts triggers and outputs the count.
 *
 * Useful for arrangement: count bars, then use comparisons to gate sections.
 *
 * Inputs:
 * - `trig`: Trigger signal (increments on rising edge > 0.5)
 * - `reset`: Reset signal (resets count on rising edge > 0.5)
 * - `max`: Maximum count before wrapping (0 = no wrap)
 *
 * Outputs:
 * - `count`: Current count (0-indexed)
 * - `wrap`: 1.0 for one sample when count wraps, 0.0 otherwise
 *
 * @example
 * ```javascript
 * // Count bars (assuming 4 beats per bar)
 * let barClock = clockDiv(clk, 4)
 * let bars = counter(barClock.trig)
 *
 * // Gate: drums come in at bar 4
 * let drumsOn = gte(bars.count, 4)
 * let drums = mult(drumMix).b(drumsOn)
 *
 * // 16-bar loop
 * let section = counter(barClock.trig).max(16)
 * ```
 */
export const counter = device({
	inputs: inputs({ trig: 0, reset: 0, max: 0 }),
	outputs: ["count", "wrap"],
	defaultInput: "trig",
	defaultOutput: "count",
	process(inp, _cfg, state, _sampleRate) {
		const trig = (inp.trig ?? [0])[0] ?? 0;
		const reset = (inp.reset ?? [0])[0] ?? 0;
		const max = Math.floor((inp.max ?? [0])[0] ?? 0);

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

		return { count, wrap };
	},
});
