import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

/**
 * Multiply two signals.
 *
 * @example
 * ```javascript
 * mult(osc(440)).b(env.out)    // VCA - multiply oscillator by envelope
 * mult(lfo).b(100)             // Scale LFO output
 * ```
 */
export const mult = device({
	inputs: inputs({ a: 0, b: 1 }),
	outputs: ["out"],
	defaultInput: "a",
	defaultOutput: "out",
	process(inp, _cfg, _state, _sampleRate) {
		const aIn = inp.a ?? [0];
		const bIn = inp.b ?? [1];
		const numChannels = Math.max(aIn.length, bIn.length);
		const out: number[] = [];
		for (let c = 0; c < numChannels; c++) {
			out.push((aIn[c % aIn.length] ?? 0) * (bIn[c % bIn.length] ?? 1));
		}
		return { out };
	},
});

/**
 * Subtract signal b from signal a.
 *
 * @example
 * ```javascript
 * sub(osc1).b(osc2)            // Difference of two oscillators
 * sub(1).b(env.out)            // Invert envelope (1 - env)
 * ```
 */
export const sub = device({
	inputs: inputs({ a: 0, b: 0 }),
	outputs: ["out"],
	defaultInput: "a",
	defaultOutput: "out",
	process(inp, _cfg, _state, _sampleRate) {
		const aIn = inp.a ?? [0];
		const bIn = inp.b ?? [0];
		const numChannels = Math.max(aIn.length, bIn.length);
		const out: number[] = [];
		for (let c = 0; c < numChannels; c++) {
			out.push((aIn[c % aIn.length] ?? 0) - (bIn[c % bIn.length] ?? 0));
		}
		return { out };
	},
});

/**
 * Clip/clamp signal to a range.
 *
 * @example
 * ```javascript
 * clip(osc(440)).min(-0.5).max(0.5)  // Soft clipping
 * clip(lfo).min(0).max(1)            // Unipolar output
 * ```
 */
export const clip = device({
	inputs: inputs({ input: 0, min: -1, max: 1 }),
	outputs: ["out"],
	defaultInput: "input",
	defaultOutput: "out",
	process(inp, _cfg, _state, _sampleRate) {
		const inputSig = inp.input ?? [0];
		const mins = inp.min ?? [-1];
		const maxs = inp.max ?? [1];
		const numChannels = Math.max(inputSig.length, mins.length, maxs.length);
		const out: number[] = [];
		for (let c = 0; c < numChannels; c++) {
			const v = inputSig[c % inputSig.length] ?? 0;
			const min = mins[c % mins.length] ?? -1;
			const max = maxs[c % maxs.length] ?? 1;
			out.push(Math.max(min, Math.min(max, v)));
		}
		return { out };
	},
});

/**
 * Scale/map a signal from one range to another.
 *
 * Maps input from inMin..inMax to outMin..outMax.
 *
 * @example
 * ```javascript
 * scale(lfo).inMin(-1).inMax(1).outMin(200).outMax(2000)  // LFO to frequency range
 * scale(env.out).inMin(0).inMax(1).outMin(100).outMax(5000)  // Envelope to filter cutoff
 * ```
 */
export const scale = device({
	inputs: inputs({ input: 0, inMin: -1, inMax: 1, outMin: 0, outMax: 1 }),
	outputs: ["out"],
	defaultInput: "input",
	defaultOutput: "out",
	process(inp, _cfg, _state, _sampleRate) {
		const inputSig = inp.input ?? [0];
		const inMins = inp.inMin ?? [-1];
		const inMaxs = inp.inMax ?? [1];
		const outMins = inp.outMin ?? [0];
		const outMaxs = inp.outMax ?? [1];
		const numChannels = Math.max(inputSig.length, inMins.length, inMaxs.length, outMins.length, outMaxs.length);
		const out: number[] = [];
		for (let c = 0; c < numChannels; c++) {
			const v = inputSig[c % inputSig.length] ?? 0;
			const inMin = inMins[c % inMins.length] ?? -1;
			const inMax = inMaxs[c % inMaxs.length] ?? 1;
			const outMin = outMins[c % outMins.length] ?? 0;
			const outMax = outMaxs[c % outMaxs.length] ?? 1;
			const normalized = (v - inMin) / (inMax - inMin);
			out.push(outMin + normalized * (outMax - outMin));
		}
		return { out };
	},
});

/**
 * Absolute value of a signal.
 *
 * @example
 * ```javascript
 * abs(osc(2))                  // Full-wave rectified LFO
 * ```
 */
export const abs = device({
	inputs: inputs({ input: 0 }),
	outputs: ["out"],
	defaultInput: "input",
	defaultOutput: "out",
	process(inp, _cfg, _state, _sampleRate) {
		const inputSig = inp.input ?? [0];
		const out = inputSig.map((v) => Math.abs(v));
		return { out };
	},
});

/**
 * Invert/negate a signal.
 *
 * @example
 * ```javascript
 * inv(lfo)                     // Inverted LFO
 * add(1).b(inv(env.out))       // 1 - envelope
 * ```
 */
export const inv = device({
	inputs: inputs({ input: 0 }),
	outputs: ["out"],
	defaultInput: "input",
	defaultOutput: "out",
	process(inp, _cfg, _state, _sampleRate) {
		const inputSig = inp.input ?? [0];
		const out = inputSig.map((v) => -v);
		return { out };
	},
});

/**
 * Divide signal a by signal b.
 *
 * @example
 * ```javascript
 * div(input).b(2)              // Halve the signal
 * ```
 */
export const div = device({
	inputs: inputs({ a: 0, b: 1 }),
	outputs: ["out"],
	defaultInput: "a",
	defaultOutput: "out",
	process(inp, _cfg, _state, _sampleRate) {
		const aIn = inp.a ?? [0];
		const bIn = inp.b ?? [1];
		const numChannels = Math.max(aIn.length, bIn.length);
		const out: number[] = [];
		for (let c = 0; c < numChannels; c++) {
			const a = aIn[c % aIn.length] ?? 0;
			const b = bIn[c % bIn.length] ?? 1;
			out.push(b === 0 ? 0 : a / b);
		}
		return { out };
	},
});

/**
 * Modulo operation - remainder after division.
 *
 * @example
 * ```javascript
 * mod(phasor).b(0.5)           // Wrap at 0.5
 * ```
 */
export const mod = device({
	inputs: inputs({ a: 0, b: 1 }),
	outputs: ["out"],
	defaultInput: "a",
	defaultOutput: "out",
	process(inp, _cfg, _state, _sampleRate) {
		const aIn = inp.a ?? [0];
		const bIn = inp.b ?? [1];
		const numChannels = Math.max(aIn.length, bIn.length);
		const out: number[] = [];
		for (let c = 0; c < numChannels; c++) {
			const a = aIn[c % aIn.length] ?? 0;
			const b = bIn[c % bIn.length] ?? 1;
			out.push(b === 0 ? 0 : a % b);
		}
		return { out };
	},
});

/**
 * Greater than or equal comparison.
 * Outputs 1 if a >= b, 0 otherwise.
 *
 * @example
 * ```javascript
 * // Drums come in at bar 4
 * let drumsOn = gte(bars.count, 4)
 * let drums = mult(drumMix).b(drumsOn)
 * ```
 */
export const gte = device({
	inputs: inputs({ a: 0, b: 0 }),
	outputs: ["out"],
	defaultInput: "a",
	defaultOutput: "out",
	process(inp, _cfg, _state, _sampleRate) {
		const a = (inp.a ?? [0])[0] ?? 0;
		const b = (inp.b ?? [0])[0] ?? 0;
		return { out: a >= b ? 1 : 0 };
	},
});

/**
 * Less than comparison.
 * Outputs 1 if a < b, 0 otherwise.
 *
 * @example
 * ```javascript
 * // Intro only for first 8 bars
 * let introOn = lt(bars.count, 8)
 * ```
 */
export const lt = device({
	inputs: inputs({ a: 0, b: 0 }),
	outputs: ["out"],
	defaultInput: "a",
	defaultOutput: "out",
	process(inp, _cfg, _state, _sampleRate) {
		const a = (inp.a ?? [0])[0] ?? 0;
		const b = (inp.b ?? [0])[0] ?? 0;
		return { out: a < b ? 1 : 0 };
	},
});

/**
 * Equal comparison (with tolerance for floating point).
 * Outputs 1 if a == b (within 0.0001), 0 otherwise.
 *
 * @example
 * ```javascript
 * // Only play on bar 0 of each 16-bar section
 * let dropBar = eq(section.count, 0)
 * ```
 */
export const eq = device({
	inputs: inputs({ a: 0, b: 0 }),
	outputs: ["out"],
	defaultInput: "a",
	defaultOutput: "out",
	process(inp, _cfg, _state, _sampleRate) {
		const a = (inp.a ?? [0])[0] ?? 0;
		const b = (inp.b ?? [0])[0] ?? 0;
		return { out: Math.abs(a - b) < 0.0001 ? 1 : 0 };
	},
});

/**
 * Logical AND - outputs 1 if both inputs are > 0.5, 0 otherwise.
 *
 * @example
 * ```javascript
 * // Play only in bars 4-8
 * let section = and(gte(bars, 4)).b(lt(bars, 8))
 * ```
 */
export const and = device({
	inputs: inputs({ a: 0, b: 0 }),
	outputs: ["out"],
	defaultInput: "a",
	defaultOutput: "out",
	process(inp, _cfg, _state, _sampleRate) {
		const a = (inp.a ?? [0])[0] ?? 0;
		const b = (inp.b ?? [0])[0] ?? 0;
		return { out: a > 0.5 && b > 0.5 ? 1 : 0 };
	},
});

/**
 * Logical OR - outputs 1 if either input is > 0.5, 0 otherwise.
 *
 * @example
 * ```javascript
 * // Play in bars 0-4 OR bars 12-16
 * let playHere = or(lt(bars, 4)).b(gte(bars, 12))
 * ```
 */
export const or = device({
	inputs: inputs({ a: 0, b: 0 }),
	outputs: ["out"],
	defaultInput: "a",
	defaultOutput: "out",
	process(inp, _cfg, _state, _sampleRate) {
		const a = (inp.a ?? [0])[0] ?? 0;
		const b = (inp.b ?? [0])[0] ?? 0;
		return { out: a > 0.5 || b > 0.5 ? 1 : 0 };
	},
});

/**
 * Logical NOT - outputs 1 if input is <= 0.5, 0 otherwise.
 *
 * @example
 * ```javascript
 * // Mute drums for first 4 bars
 * let drumsOn = not(lt(bars, 4))
 * ```
 */
export const not = device({
	inputs: inputs({ input: 0 }),
	outputs: ["out"],
	defaultInput: "input",
	defaultOutput: "out",
	process(inp, _cfg, _state, _sampleRate) {
		const input = (inp.input ?? [0])[0] ?? 0;
		return { out: input > 0.5 ? 0 : 1 };
	},
});
