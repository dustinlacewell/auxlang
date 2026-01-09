import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

// PolySignal type for process function (runtime uses globalThis.poly)
type PS = Array<{ id: number; value: number }>;

/** White noise generator. */
export const noise = device({
	inputs: inputs({ min: -1, max: 1 }),
	outputs: ["out"],
	defaultInput: "min",
	defaultOutput: "out",
	process(inp, _cfg, _state, _sampleRate) {
		const mins = (inp.min ?? []) as PS;
		const maxs = (inp.max ?? []) as PS;

		// If both empty, generate mono noise with defaults
		if (mins.length === 0 && maxs.length === 0) {
			return { out: [{ id: 0, value: -1 + Math.random() * 2 }] };
		}

		const voiceIds = poly.getVoiceIds(mins, maxs);
		if (voiceIds.length === 0) {
			return { out: [{ id: 0, value: -1 + Math.random() * 2 }] };
		}

		const out: PS = [];
		for (const id of voiceIds) {
			const min = poly.getValue(mins, id, -1);
			const max = poly.getValue(maxs, id, 1);
			out.push({ id, value: min + Math.random() * (max - min) });
		}

		return { out };
	},
});
