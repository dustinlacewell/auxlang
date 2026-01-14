import { device } from "../device/device";

/**
 * Clock divider - outputs a trigger every N input triggers.
 * Expects impulse triggers (trig > 0 for one sample).
 */
export const clockDiv = device("clockDiv", {
	inputs: { trig: 0, by: 4 },
	outputs: ["trig", "gate"],
	defaultInput: "trig",
	defaultOutput: "trig",
	process(inp, _cfg, state, _sampleRate, _time, out) {
		const trig = inp.trig
		const div = Math.max(1, Math.floor((inp.by as number) ?? 4));

		// Forward reset signal (negative BPM from clock)
		if (trig < -0.5) {
			state.count = 0;
			out.trig = trig; // Pass through reset signal
			out.gate = 0;
			return;
		}

		let count = (state.count as number) ?? 0;

		let outTrig = 0;
		if (trig > 0.5) {
			count = count + 1;
			if (count >= div) {
				count = 0;
				outTrig = 1;
			}
		}

		const gate = count < div / 2 ? 1 : 0;

		state.count = count;
		out.trig = outTrig;
		out.gate = gate;
	},
});

/**
 * Clock multiplier - outputs N triggers for each input trigger.
 * Expects impulse triggers (trig > 0 for one sample).
 * Supports fractional multipliers for smooth tempo changes.
 */
export const clockMult = device("clockMult", {
	inputs: { trig: 0, by: 2 },
	outputs: ["trig", "gate"],
	defaultInput: "trig",
	defaultOutput: "trig",
	process(inp, _cfg, state, sampleRate, _time, out) {
		const trig = inp.trig
		// Allow fractional multipliers for smooth tempo modulation
		const mult = Math.max(0.1, (inp.by as number) ?? 2);

		// Forward reset signal (negative BPM from clock)
		if (trig < -0.5) {
			state.phase = 0;
			state.lastTrigSample = 0;
			state.sampleCount = 0;
			out.trig = trig; // Pass through reset signal
			out.gate = 0;
			return;
		}

		let phase = (state.phase as number) ?? 0;
		let interval = (state.interval as number) ?? sampleRate;
		let lastTrigSample = (state.lastTrigSample as number) ?? 0;
		let sampleCount = (state.sampleCount as number) ?? 0;

		// Trigger is an impulse - just check if high
		if (trig > 0.5) {
			const newInterval = sampleCount - lastTrigSample;
			if (newInterval > 0) {
				interval = newInterval;
			}
			lastTrigSample = sampleCount;
			// Don't reset phase on input trigger - let it free-run at current rate
		}

		const subInterval = interval / mult;
		let outTrig = 0;

		if (phase >= subInterval) {
			phase = phase - subInterval;
			outTrig = 1;
		}

		const gate = phase < subInterval / 2 ? 1 : 0;

		phase = phase + 1;
		sampleCount = sampleCount + 1;

		state.phase = phase;
		state.interval = interval;
		state.lastTrigSample = lastTrigSample;
		state.sampleCount = sampleCount;

		out.trig = outTrig;
		out.gate = gate;
	},
});
