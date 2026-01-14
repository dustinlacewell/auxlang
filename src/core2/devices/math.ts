import { device } from "../device/device";

/** Multiply two signals. */
export const mult = device("mult", {
	inputs: { input: 0, by: 1 },
	outputs: ["val"],
	defaultInput: "input",
	defaultOutput: "val",
	process(inp, _cfg, _state, _sampleRate, _time, out) {
		const input = inp.input
		const by = inp.by
		out.val = input * by;
	},
});

/** Subtract input from another value. sub(x).from(y) returns y - x */
export const sub = device("sub", {
	inputs: { input: 0, from: 0 },
	outputs: ["val"],
	defaultInput: "input",
	defaultOutput: "val",
	process(inp, _cfg, _state, _sampleRate, _time, out) {
		const input = inp.input
		const from = inp.from
		out.val = from - input;
	},
});

/** Clip/clamp signal to a range. */
export const clip = device("clip", {
	inputs: { input: 0, min: -1, max: 1 },
	outputs: ["val"],
	defaultInput: "input",
	defaultOutput: "val",
	process(inp, _cfg, _state, _sampleRate, _time, out) {
		const input = inp.input
		const min = (inp.min as number) ?? -1;
		const max = inp.max
		out.val = Math.max(min, Math.min(max, input));
	},
});

/** Scale/map a signal from one range to another. */
export const scale = device("scale", {
	inputs: { input: 0, from: -1, to: 1, min: 0, max: 1 },
	outputs: ["val"],
	defaultInput: "input",
	defaultOutput: "val",
	process(inp, _cfg, _state, _sampleRate, _time, out) {
		const input = inp.input
		const from = (inp.from as number) ?? -1;
		const to = inp.to
		const min = inp.min
		const max = inp.max
		const normalized = (input - from) / (to - from);
		out.val = min + normalized * (max - min);
	},
});

/** Absolute value of a signal. */
export const abs = device("abs", {
	inputs: { input: 0 },
	outputs: ["val"],
	defaultInput: "input",
	defaultOutput: "val",
	process(inp, _cfg, _state, _sampleRate, _time, out) {
		const input = inp.input
		out.val = Math.abs(input);
	},
});

/** Invert/negate a signal. */
export const inv = device("inv", {
	inputs: { input: 0 },
	outputs: ["val"],
	defaultInput: "input",
	defaultOutput: "val",
	process(inp, _cfg, _state, _sampleRate, _time, out) {
		const input = inp.input
		out.val = -input;
	},
});

/** Divide input by another signal. */
export const div = device("div", {
	inputs: { input: 0, by: 1 },
	outputs: ["val"],
	defaultInput: "input",
	defaultOutput: "val",
	process(inp, _cfg, _state, _sampleRate, _time, out) {
		const input = inp.input
		const by = inp.by
		out.val = by === 0 ? 0 : input / by;
	},
});

/** Modulo operation - remainder after division. */
export const mod = device("mod", {
	inputs: { input: 0, by: 1 },
	outputs: ["val"],
	defaultInput: "input",
	defaultOutput: "val",
	process(inp, _cfg, _state, _sampleRate, _time, out) {
		const input = inp.input
		const by = inp.by
		out.val = by === 0 ? 0 : input % by;
	},
});

/** Greater than or equal comparison. Outputs 1 if input >= than, 0 otherwise. */
export const gte = device("gte", {
	inputs: { input: 0, than: 0 },
	outputs: ["val"],
	defaultInput: "input",
	defaultOutput: "val",
	process(inp, _cfg, _state, _sampleRate, _time, out) {
		const input = inp.input
		const than = inp.than
		out.val = input >= than ? 1 : 0;
	},
});

/** Less than comparison. Outputs 1 if input < than, 0 otherwise. */
export const lt = device("lt", {
	inputs: { input: 0, than: 0 },
	outputs: ["val"],
	defaultInput: "input",
	defaultOutput: "val",
	process(inp, _cfg, _state, _sampleRate, _time, out) {
		const input = inp.input
		const than = inp.than
		out.val = input < than ? 1 : 0;
	},
});

/** Equal comparison (with tolerance for floating point). */
export const eq = device("eq", {
	inputs: { input: 0, to: 0 },
	outputs: ["val"],
	defaultInput: "input",
	defaultOutput: "val",
	process(inp, _cfg, _state, _sampleRate, _time, out) {
		const input = inp.input
		const to = inp.to
		out.val = Math.abs(input - to) < 0.0001 ? 1 : 0;
	},
});

/** Logical AND - outputs 1 if both inputs are > 0.5, 0 otherwise. */
export const and = device("and", {
	inputs: { input: 0, with: 0 },
	outputs: ["val"],
	defaultInput: "input",
	defaultOutput: "val",
	process(inp, _cfg, _state, _sampleRate, _time, out) {
		const input = inp.input
		const withVal = inp.with
		out.val = input > 0.5 && withVal > 0.5 ? 1 : 0;
	},
});

/** Logical OR - outputs 1 if either input is > 0.5, 0 otherwise. */
export const or = device("or", {
	inputs: { input: 0, with: 0 },
	outputs: ["val"],
	defaultInput: "input",
	defaultOutput: "val",
	process(inp, _cfg, _state, _sampleRate, _time, out) {
		const input = inp.input
		const withVal = inp.with
		out.val = input > 0.5 || withVal > 0.5 ? 1 : 0;
	},
});

/** Logical NOT - outputs 1 if input is <= 0.5, 0 otherwise. */
export const not = device("not", {
	inputs: { input: 0 },
	outputs: ["val"],
	defaultInput: "input",
	defaultOutput: "val",
	process(inp, _cfg, _state, _sampleRate, _time, out) {
		const input = inp.input
		out.val = input > 0.5 ? 0 : 1;
	},
});
