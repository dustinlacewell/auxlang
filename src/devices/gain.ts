import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

/**
 * Gain - multiply input by level.
 * Use with envelope for amplitude modulation: .gain({ level: gate.adsr(...) })
 */
export const gain = device("gain", {
	inputs: inputs({ input: 0, level: 1 }),
	outputs: ["signal"],
	defaultInput: "input",
	defaultOutput: "signal",
	process(inp, _cfg, _state, _sampleRate) {
		const input = (inp.input as number) ?? 0;
		const level = (inp.level as number) ?? 1;
		return { signal: input * level };
	},
});
