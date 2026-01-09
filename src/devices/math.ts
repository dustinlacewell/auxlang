import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

// PolySignal type for process function (runtime uses globalThis.poly)
type PS = Array<{ id: number; value: number }>;

/** Multiply two signals. */
export const mult = device({
	inputs: inputs({ input: 0, by: 1 }),
	outputs: ["out"],
	defaultInput: "input",
	defaultOutput: "out",
	process(inp, _cfg, _state, _sampleRate) {
		const inputSig = (inp.input ?? []) as PS;
		const bySig = (inp.by ?? []) as PS;
		if (inputSig.length === 0) return { out: [] };
		const voiceIds = poly.getVoiceIds(inputSig, bySig);
		const out: PS = [];
		for (const id of voiceIds) {
			const a = poly.getValue(inputSig, id, 0);
			const b = poly.getValue(bySig, id, 1);
			out.push({ id, value: a * b });
		}
		return { out };
	},
});

/** Subtract input from another value. sub(x).from(y) returns y - x */
export const sub = device({
	inputs: inputs({ input: 0, from: 0 }),
	outputs: ["out"],
	defaultInput: "input",
	defaultOutput: "out",
	process(inp, _cfg, _state, _sampleRate) {
		const inputSig = (inp.input ?? []) as PS;
		const fromSig = (inp.from ?? []) as PS;
		if (inputSig.length === 0 && fromSig.length === 0) return { out: [] };
		const voiceIds = poly.getVoiceIds(inputSig, fromSig);
		const out: PS = [];
		for (const id of voiceIds) {
			const x = poly.getValue(inputSig, id, 0);
			const y = poly.getValue(fromSig, id, 0);
			out.push({ id, value: y - x });
		}
		return { out };
	},
});

/** Clip/clamp signal to a range. */
export const clip = device({
	inputs: inputs({ input: 0, min: -1, max: 1 }),
	outputs: ["out"],
	defaultInput: "input",
	defaultOutput: "out",
	process(inp, _cfg, _state, _sampleRate) {
		const inputSig = (inp.input ?? []) as PS;
		const mins = (inp.min ?? []) as PS;
		const maxs = (inp.max ?? []) as PS;
		if (inputSig.length === 0) return { out: [] };
		const voiceIds = poly.getVoiceIds(inputSig, mins, maxs);
		const out: PS = [];
		for (const id of voiceIds) {
			const v = poly.getValue(inputSig, id, 0);
			const min = poly.getValue(mins, id, -1);
			const max = poly.getValue(maxs, id, 1);
			out.push({ id, value: Math.max(min, Math.min(max, v)) });
		}
		return { out };
	},
});

/** Scale/map a signal from one range to another. */
export const scale = device({
	inputs: inputs({ input: 0, from: -1, to: 1, min: 0, max: 1 }),
	outputs: ["out"],
	defaultInput: "input",
	defaultOutput: "out",
	process(inp, _cfg, _state, _sampleRate) {
		const inputSig = (inp.input ?? []) as PS;
		const fromVals = (inp.from ?? []) as PS;
		const toVals = (inp.to ?? []) as PS;
		const minVals = (inp.min ?? []) as PS;
		const maxVals = (inp.max ?? []) as PS;
		if (inputSig.length === 0) return { out: [] };
		const voiceIds = poly.getVoiceIds(inputSig, fromVals, toVals, minVals, maxVals);
		const out: PS = [];
		for (const id of voiceIds) {
			const v = poly.getValue(inputSig, id, 0);
			const from = poly.getValue(fromVals, id, -1);
			const to = poly.getValue(toVals, id, 1);
			const min = poly.getValue(minVals, id, 0);
			const max = poly.getValue(maxVals, id, 1);
			const normalized = (v - from) / (to - from);
			out.push({ id, value: min + normalized * (max - min) });
		}
		return { out };
	},
});

/** Absolute value of a signal. */
export const abs = device({
	inputs: inputs({ input: 0 }),
	outputs: ["out"],
	defaultInput: "input",
	defaultOutput: "out",
	process(inp, _cfg, _state, _sampleRate) {
		const inputSig = (inp.input ?? []) as PS;
		const out: PS = inputSig.map((ch) => ({ id: ch.id, value: Math.abs(ch.value) }));
		return { out };
	},
});

/** Invert/negate a signal. */
export const inv = device({
	inputs: inputs({ input: 0 }),
	outputs: ["out"],
	defaultInput: "input",
	defaultOutput: "out",
	process(inp, _cfg, _state, _sampleRate) {
		const inputSig = (inp.input ?? []) as PS;
		const out: PS = inputSig.map((ch) => ({ id: ch.id, value: -ch.value }));
		return { out };
	},
});

/** Divide input by another signal. */
export const div = device({
	inputs: inputs({ input: 0, by: 1 }),
	outputs: ["out"],
	defaultInput: "input",
	defaultOutput: "out",
	process(inp, _cfg, _state, _sampleRate) {
		const inputSig = (inp.input ?? []) as PS;
		const bySig = (inp.by ?? []) as PS;
		if (inputSig.length === 0) return { out: [] };
		const voiceIds = poly.getVoiceIds(inputSig, bySig);
		const out: PS = [];
		for (const id of voiceIds) {
			const a = poly.getValue(inputSig, id, 0);
			const b = poly.getValue(bySig, id, 1);
			out.push({ id, value: b === 0 ? 0 : a / b });
		}
		return { out };
	},
});

/** Modulo operation - remainder after division. */
export const mod = device({
	inputs: inputs({ input: 0, by: 1 }),
	outputs: ["out"],
	defaultInput: "input",
	defaultOutput: "out",
	process(inp, _cfg, _state, _sampleRate) {
		const inputSig = (inp.input ?? []) as PS;
		const bySig = (inp.by ?? []) as PS;
		if (inputSig.length === 0) return { out: [] };
		const voiceIds = poly.getVoiceIds(inputSig, bySig);
		const out: PS = [];
		for (const id of voiceIds) {
			const a = poly.getValue(inputSig, id, 0);
			const b = poly.getValue(bySig, id, 1);
			out.push({ id, value: b === 0 ? 0 : a % b });
		}
		return { out };
	},
});

/** Greater than or equal comparison. Outputs 1 if input >= than, 0 otherwise. */
export const gte = device({
	inputs: inputs({ input: 0, than: 0 }),
	outputs: ["out"],
	defaultInput: "input",
	defaultOutput: "out",
	process(inp, _cfg, _state, _sampleRate) {
		const inputSig = (inp.input ?? []) as PS;
		const thanSig = (inp.than ?? []) as PS;
		if (inputSig.length === 0) return { out: [] };
		const voiceIds = poly.getVoiceIds(inputSig, thanSig);
		const out: PS = [];
		for (const id of voiceIds) {
			const a = poly.getValue(inputSig, id, 0);
			const b = poly.getValue(thanSig, id, 0);
			out.push({ id, value: a >= b ? 1 : 0 });
		}
		return { out };
	},
});

/** Less than comparison. Outputs 1 if input < than, 0 otherwise. */
export const lt = device({
	inputs: inputs({ input: 0, than: 0 }),
	outputs: ["out"],
	defaultInput: "input",
	defaultOutput: "out",
	process(inp, _cfg, _state, _sampleRate) {
		const inputSig = (inp.input ?? []) as PS;
		const thanSig = (inp.than ?? []) as PS;
		if (inputSig.length === 0) return { out: [] };
		const voiceIds = poly.getVoiceIds(inputSig, thanSig);
		const out: PS = [];
		for (const id of voiceIds) {
			const a = poly.getValue(inputSig, id, 0);
			const b = poly.getValue(thanSig, id, 0);
			out.push({ id, value: a < b ? 1 : 0 });
		}
		return { out };
	},
});

/** Equal comparison (with tolerance for floating point). Outputs 1 if input == to (within 0.0001), 0 otherwise. */
export const eq = device({
	inputs: inputs({ input: 0, to: 0 }),
	outputs: ["out"],
	defaultInput: "input",
	defaultOutput: "out",
	process(inp, _cfg, _state, _sampleRate) {
		const inputSig = (inp.input ?? []) as PS;
		const toSig = (inp.to ?? []) as PS;
		if (inputSig.length === 0) return { out: [] };
		const voiceIds = poly.getVoiceIds(inputSig, toSig);
		const out: PS = [];
		for (const id of voiceIds) {
			const a = poly.getValue(inputSig, id, 0);
			const b = poly.getValue(toSig, id, 0);
			out.push({ id, value: Math.abs(a - b) < 0.0001 ? 1 : 0 });
		}
		return { out };
	},
});

/** Logical AND - outputs 1 if both inputs are > 0.5, 0 otherwise. */
export const and = device({
	inputs: inputs({ input: 0, with: 0 }),
	outputs: ["out"],
	defaultInput: "input",
	defaultOutput: "out",
	process(inp, _cfg, _state, _sampleRate) {
		const inputSig = (inp.input ?? []) as PS;
		const withSig = (inp.with ?? []) as PS;
		if (inputSig.length === 0) return { out: [] };
		const voiceIds = poly.getVoiceIds(inputSig, withSig);
		const out: PS = [];
		for (const id of voiceIds) {
			const a = poly.getValue(inputSig, id, 0);
			const b = poly.getValue(withSig, id, 0);
			out.push({ id, value: a > 0.5 && b > 0.5 ? 1 : 0 });
		}
		return { out };
	},
});

/** Logical OR - outputs 1 if either input is > 0.5, 0 otherwise. */
export const or = device({
	inputs: inputs({ input: 0, with: 0 }),
	outputs: ["out"],
	defaultInput: "input",
	defaultOutput: "out",
	process(inp, _cfg, _state, _sampleRate) {
		const inputSig = (inp.input ?? []) as PS;
		const withSig = (inp.with ?? []) as PS;
		if (inputSig.length === 0) return { out: [] };
		const voiceIds = poly.getVoiceIds(inputSig, withSig);
		const out: PS = [];
		for (const id of voiceIds) {
			const a = poly.getValue(inputSig, id, 0);
			const b = poly.getValue(withSig, id, 0);
			out.push({ id, value: a > 0.5 || b > 0.5 ? 1 : 0 });
		}
		return { out };
	},
});

/** Logical NOT - outputs 1 if input is <= 0.5, 0 otherwise. */
export const not = device({
	inputs: inputs({ input: 0 }),
	outputs: ["out"],
	defaultInput: "input",
	defaultOutput: "out",
	process(inp, _cfg, _state, _sampleRate) {
		const inputSig = (inp.input ?? []) as PS;
		const out: PS = inputSig.map((ch) => ({ id: ch.id, value: ch.value > 0.5 ? 0 : 1 }));
		return { out };
	},
});
