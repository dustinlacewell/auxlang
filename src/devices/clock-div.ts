import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

// PolySignal format: {id: number, value: number}[]
type PolySignal = Array<{ id: number; value: number }>;

/**
 * Clock divider - outputs a trigger every N input triggers.
 */
export const clockDiv = device({
	inputs: inputs({ trig: 0, by: 4 }),
	outputs: ["trig", "gate"],
	defaultInput: "trig",
	defaultOutput: "trig",
	process(inp, _cfg, state, _sampleRate) {
		const trigSig = (inp.trig ?? []) as PolySignal;
		const bySig = (inp.by ?? []) as PolySignal;
		const trig = trigSig.length > 0 ? trigSig[0]!.value : 0;
		const div = Math.max(1, Math.floor(bySig.length > 0 ? bySig[0]!.value : 4));

		let count = (state.count as number) ?? 0;
		const wasTrig = (state.wasTrig as number) ?? 0;

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

		const gate = count < div / 2 ? 1 : 0;

		state.count = count;
		state.wasTrig = trig;

		return { trig: [{ id: 0, value: outTrig }], gate: [{ id: 0, value: gate }] };
	},
});

/**
 * Clock multiplier - outputs N triggers for each input trigger.
 */
export const clockMult = device({
	inputs: inputs({ trig: 0, by: 2 }),
	outputs: ["trig", "gate"],
	defaultInput: "trig",
	defaultOutput: "trig",
	process(inp, _cfg, state, sampleRate) {
		const trigSig = (inp.trig ?? []) as PolySignal;
		const bySig = (inp.by ?? []) as PolySignal;
		const trig = trigSig.length > 0 ? trigSig[0]!.value : 0;
		const mult = Math.max(1, Math.floor(bySig.length > 0 ? bySig[0]!.value : 2));

		let phase = (state.phase as number) ?? 0;
		let interval = (state.interval as number) ?? sampleRate;
		let lastTrigSample = (state.lastTrigSample as number) ?? 0;
		let sampleCount = (state.sampleCount as number) ?? 0;
		const wasTrig = (state.wasTrig as number) ?? 0;

		const trigOn = trig > 0.5;
		const trigWasOn = wasTrig > 0.5;
		const trigRising = trigOn && !trigWasOn;

		if (trigRising) {
			const newInterval = sampleCount - lastTrigSample;
			if (newInterval > 0) {
				interval = newInterval;
			}
			lastTrigSample = sampleCount;
			phase = 0;
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
		state.wasTrig = trig;

		return { trig: [{ id: 0, value: outTrig }], gate: [{ id: 0, value: gate }] };
	},
});
