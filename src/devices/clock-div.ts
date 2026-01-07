import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

/**
 * Clock divider - outputs a trigger every N input triggers.
 *
 * Useful for creating bar-level clocks from beat clocks.
 *
 * Inputs:
 * - `trig`: Input trigger signal
 * - `div`: Division factor (default 4 = 4 beats per output)
 *
 * Outputs:
 * - `trig`: Trigger output (1 for one sample every N inputs)
 * - `gate`: Gate output (high for first half of division period)
 *
 * @example
 * ```javascript
 * // Bar clock from beat clock (4/4 time)
 * let barClk = clockDiv(clk.trig, 4)
 *
 * // Count bars
 * let bars = counter(barClk.trig)
 * ```
 */
export const clockDiv = device({
	inputs: inputs({ trig: 0, div: 4 }),
	outputs: ["trig", "gate"],
	defaultInput: "trig",
	defaultOutput: "trig",
	process(inp, _cfg, state, _sampleRate) {
		const trig = (inp.trig ?? [0])[0] ?? 0;
		const div = Math.max(1, Math.floor((inp.div ?? [4])[0] ?? 4));

		// State
		let count = (state.count as number) ?? 0;
		const wasTrig = (state.wasTrig as number) ?? 0;

		// Edge detection
		const trigOn = trig > 0.5;
		const trigWasOn = wasTrig > 0.5;
		const trigRising = trigOn && !trigWasOn;

		let outTrig = 0;
		if (trigRising) {
			count = count + 1;
			if (count >= div) {
				count = 0;
				outTrig = 1;
			}
		}

		// Gate is high for first half of division
		const gate = count < div / 2 ? 1 : 0;

		// Update state
		state.count = count;
		state.wasTrig = trig;

		return { trig: outTrig, gate };
	},
});

/**
 * Clock multiplier - outputs N triggers for each input trigger.
 *
 * Creates faster subdivisions from a slower clock.
 *
 * Inputs:
 * - `trig`: Input trigger signal
 * - `mult`: Multiplication factor (default 2)
 *
 * Note: This is a simple implementation that subdivides evenly
 * between input triggers. For best results, use with a steady clock.
 *
 * @example
 * ```javascript
 * // 8th notes from quarter note clock
 * let eighths = clockMult(clk.trig, 2)
 *
 * // 16th notes
 * let sixteenths = clockMult(clk.trig, 4)
 * ```
 */
export const clockMult = device({
	inputs: inputs({ trig: 0, mult: 2 }),
	outputs: ["trig", "gate"],
	defaultInput: "trig",
	defaultOutput: "trig",
	process(inp, _cfg, state, sampleRate) {
		const trig = (inp.trig ?? [0])[0] ?? 0;
		const mult = Math.max(1, Math.floor((inp.mult ?? [2])[0] ?? 2));

		// State
		let phase = (state.phase as number) ?? 0;
		let interval = (state.interval as number) ?? sampleRate; // samples between input trigs
		let lastTrigSample = (state.lastTrigSample as number) ?? 0;
		let sampleCount = (state.sampleCount as number) ?? 0;
		const wasTrig = (state.wasTrig as number) ?? 0;

		// Edge detection
		const trigOn = trig > 0.5;
		const trigWasOn = wasTrig > 0.5;
		const trigRising = trigOn && !trigWasOn;

		// On input trigger, calculate new interval
		if (trigRising) {
			const newInterval = sampleCount - lastTrigSample;
			if (newInterval > 0) {
				interval = newInterval;
			}
			lastTrigSample = sampleCount;
			phase = 0;
		}

		// Generate output triggers at subdivided intervals
		const subInterval = interval / mult;
		let outTrig = 0;

		if (phase >= subInterval) {
			phase = phase - subInterval;
			outTrig = 1;
		}

		// Gate high for first half of sub-interval
		const gate = phase < subInterval / 2 ? 1 : 0;

		// Advance
		phase = phase + 1;
		sampleCount = sampleCount + 1;

		// Update state
		state.phase = phase;
		state.interval = interval;
		state.lastTrigSample = lastTrigSample;
		state.sampleCount = sampleCount;
		state.wasTrig = trig;

		return { trig: outTrig, gate };
	},
});
