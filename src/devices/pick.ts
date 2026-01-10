import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

/**
 * Pick - pass through device.
 * With compile-time poly decomposition, each runtime device is mono.
 * This device is kept for API compatibility but just passes the input through.
 */
export function pick(_voiceId: number) {
	return device("pick", {
		inputs: inputs({ input: 0 }),
		outputs: ["signal"],
		defaultInput: "input",
		defaultOutput: "signal",
		process(inp, _cfg, _state, _sampleRate) {
			const input = (inp.input as number) ?? 0;
			return { signal: input };
		},
	});
}
