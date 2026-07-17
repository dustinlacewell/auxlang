import { device } from "../device/device";

/**
 * Swing device - warps phase for swing timing.
 *
 * Takes a linear phase input and outputs a warped phase where
 * odd beats are delayed. Amount 0 = no swing, 0.5 = maximum swing.
 *
 * Use between clock and seq:
 *   clock(120).swing(0.2).seq("c4 e4 g4 e4")
 */
export const swing = device("swing", {
	inputs: { phase: 0, amount: 0 },
	outputs: ["phase"],
	defaultInput: "phase",
	defaultOutput: "phase",
	positionalArgs: ["amount"],

	process(inp, _cfg, _state, _sampleRate, _time, out) {
		const phase = inp.phase as number;
		const amount = Math.max(0, Math.min(0.5, (inp.amount as number) ?? 0));

		if (amount === 0) {
			out.phase = phase;
			return;
		}

		const beat = Math.floor(phase);
		const within = phase - beat;
		const isOdd = beat % 2 === 1;

		if (isOdd) {
			// Odd beat: compressed, started late
			out.phase = beat + amount + within * (1 - amount);
		} else {
			// Even beat: stretched to fill until odd beat starts
			out.phase = beat + within * (1 + amount);
		}
	},
});
