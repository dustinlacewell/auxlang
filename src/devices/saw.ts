import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

export const saw = device({
	inputs: inputs({ pitch: 440, detune: 0 }),
	outputs: ["out"],
	defaultInput: "pitch",
	defaultOutput: "out",
	process(inp, _cfg, state, sampleRate) {
		const pitch = inp.pitch ?? 440;
		const detune = inp.detune ?? 0;
		const freq = pitch * 2 ** (detune / 1200);
		state.phase = ((state.phase as number) || 0) + freq / sampleRate;
		state.phase = (state.phase as number) % 1;
		return { out: (state.phase as number) * 2 - 1 };
	},
});
