import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

/**
 * Multiply two signals.
 *
 * @example
 * ```javascript
 * mult(osc(440)).by(env.out)    // VCA - multiply oscillator by envelope
 * mult(lfo).by(100)             // Scale LFO output
 * ```
 */
export const mult = device({
	inputs: inputs({ input: 0, by: 1 }),
	outputs: ["out"],
	defaultInput: "input",
	defaultOutput: "out",
	process(inp, _cfg, _state, _sampleRate) {
		const inputSig = inp.input ?? [0];
		const bySig = inp.by ?? [1];
		const numChannels = Math.max(inputSig.length, bySig.length);
		const out: number[] = [];
		for (let c = 0; c < numChannels; c++) {
			out.push((inputSig[c % inputSig.length] ?? 0) * (bySig[c % bySig.length] ?? 1));
		}
		return { out };
	},
});

/**
 * Subtract input from another value.
 * sub(x).from(y) returns y - x ("subtract x from y")
 *
 * @example
 * ```javascript
 * sub(env.out).from(1)         // Invert envelope (1 - env)
 * sub(osc2).from(osc1)         // Difference of two oscillators
 * ```
 */
export const sub = device({
	inputs: inputs({ input: 0, from: 0 }),
	outputs: ["out"],
	defaultInput: "input",
	defaultOutput: "out",
	process(inp, _cfg, _state, _sampleRate) {
		const inputSig = inp.input ?? [0];
		const fromSig = inp.from ?? [0];
		const numChannels = Math.max(inputSig.length, fromSig.length);
		const out: number[] = [];
		for (let c = 0; c < numChannels; c++) {
			// sub(x).from(y) = y - x
			out.push((fromSig[c % fromSig.length] ?? 0) - (inputSig[c % inputSig.length] ?? 0));
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
 * Maps input from..to range to min..max range.
 *
 * @example
 * ```javascript
 * scale(lfo).from(-1).to(1).min(200).max(2000)  // LFO to frequency range
 * scale(lfo).min(200).max(2000)                  // Same (from/to default to -1..1)
 * ```
 */
export const scale = device({
	inputs: inputs({ input: 0, from: -1, to: 1, min: 0, max: 1 }),
	outputs: ["out"],
	defaultInput: "input",
	defaultOutput: "out",
	process(inp, _cfg, _state, _sampleRate) {
		const inputSig = inp.input ?? [0];
		const fromVals = inp.from ?? [-1];
		const toVals = inp.to ?? [1];
		const minVals = inp.min ?? [0];
		const maxVals = inp.max ?? [1];
		const numChannels = Math.max(inputSig.length, fromVals.length, toVals.length, minVals.length, maxVals.length);
		const out: number[] = [];
		for (let c = 0; c < numChannels; c++) {
			const v = inputSig[c % inputSig.length] ?? 0;
			const from = fromVals[c % fromVals.length] ?? -1;
			const to = toVals[c % toVals.length] ?? 1;
			const min = minVals[c % minVals.length] ?? 0;
			const max = maxVals[c % maxVals.length] ?? 1;
			const normalized = (v - from) / (to - from);
			out.push(min + normalized * (max - min));
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
 * Divide input by another signal.
 *
 * @example
 * ```javascript
 * div(input).by(2)              // Halve the signal
 * ```
 */
export const div = device({
	inputs: inputs({ input: 0, by: 1 }),
	outputs: ["out"],
	defaultInput: "input",
	defaultOutput: "out",
	process(inp, _cfg, _state, _sampleRate) {
		const inputSig = inp.input ?? [0];
		const bySig = inp.by ?? [1];
		const numChannels = Math.max(inputSig.length, bySig.length);
		const out: number[] = [];
		for (let c = 0; c < numChannels; c++) {
			const a = inputSig[c % inputSig.length] ?? 0;
			const b = bySig[c % bySig.length] ?? 1;
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
 * mod(phasor).by(0.5)           // Wrap at 0.5
 * ```
 */
export const mod = device({
	inputs: inputs({ input: 0, by: 1 }),
	outputs: ["out"],
	defaultInput: "input",
	defaultOutput: "out",
	process(inp, _cfg, _state, _sampleRate) {
		const inputSig = inp.input ?? [0];
		const bySig = inp.by ?? [1];
		const numChannels = Math.max(inputSig.length, bySig.length);
		const out: number[] = [];
		for (let c = 0; c < numChannels; c++) {
			const a = inputSig[c % inputSig.length] ?? 0;
			const b = bySig[c % bySig.length] ?? 1;
			out.push(b === 0 ? 0 : a % b);
		}
		return { out };
	},
});

/**
 * Greater than or equal comparison.
 * Outputs 1 if input >= than, 0 otherwise.
 *
 * @example
 * ```javascript
 * // Drums come in at bar 4
 * let drumsOn = gte(bars.count).than(4)
 * let drums = mult(drumMix).by(drumsOn)
 * ```
 */
export const gte = device({
	inputs: inputs({ input: 0, than: 0 }),
	outputs: ["out"],
	defaultInput: "input",
	defaultOutput: "out",
	process(inp, _cfg, _state, _sampleRate) {
		const inputSig = inp.input ?? [0];
		const thanSig = inp.than ?? [0];
		const numChannels = Math.max(inputSig.length, thanSig.length);
		const out: number[] = [];
		for (let c = 0; c < numChannels; c++) {
			const a = inputSig[c % inputSig.length] ?? 0;
			const b = thanSig[c % thanSig.length] ?? 0;
			out.push(a >= b ? 1 : 0);
		}
		return { out };
	},
});

/**
 * Less than comparison.
 * Outputs 1 if input < than, 0 otherwise.
 *
 * @example
 * ```javascript
 * // Intro only for first 8 bars
 * let introOn = lt(bars.count).than(8)
 * ```
 */
export const lt = device({
	inputs: inputs({ input: 0, than: 0 }),
	outputs: ["out"],
	defaultInput: "input",
	defaultOutput: "out",
	process(inp, _cfg, _state, _sampleRate) {
		const inputSig = inp.input ?? [0];
		const thanSig = inp.than ?? [0];
		const numChannels = Math.max(inputSig.length, thanSig.length);
		const out: number[] = [];
		for (let c = 0; c < numChannels; c++) {
			const a = inputSig[c % inputSig.length] ?? 0;
			const b = thanSig[c % thanSig.length] ?? 0;
			out.push(a < b ? 1 : 0);
		}
		return { out };
	},
});

/**
 * Equal comparison (with tolerance for floating point).
 * Outputs 1 if input == to (within 0.0001), 0 otherwise.
 *
 * @example
 * ```javascript
 * // Only play on bar 0 of each 16-bar section
 * let dropBar = eq(section.count).to(0)
 * ```
 */
export const eq = device({
	inputs: inputs({ input: 0, to: 0 }),
	outputs: ["out"],
	defaultInput: "input",
	defaultOutput: "out",
	process(inp, _cfg, _state, _sampleRate) {
		const inputSig = inp.input ?? [0];
		const toSig = inp.to ?? [0];
		const numChannels = Math.max(inputSig.length, toSig.length);
		const out: number[] = [];
		for (let c = 0; c < numChannels; c++) {
			const a = inputSig[c % inputSig.length] ?? 0;
			const b = toSig[c % toSig.length] ?? 0;
			out.push(Math.abs(a - b) < 0.0001 ? 1 : 0);
		}
		return { out };
	},
});

/**
 * Logical AND - outputs 1 if both inputs are > 0.5, 0 otherwise.
 *
 * @example
 * ```javascript
 * // Play only in bars 4-8
 * let section = and(gte(bars).than(4)).with(lt(bars).than(8))
 * ```
 */
export const and = device({
	inputs: inputs({ input: 0, with: 0 }),
	outputs: ["out"],
	defaultInput: "input",
	defaultOutput: "out",
	process(inp, _cfg, _state, _sampleRate) {
		const inputSig = inp.input ?? [0];
		const withSig = inp.with ?? [0];
		const numChannels = Math.max(inputSig.length, withSig.length);
		const out: number[] = [];
		for (let c = 0; c < numChannels; c++) {
			const a = inputSig[c % inputSig.length] ?? 0;
			const b = withSig[c % withSig.length] ?? 0;
			out.push(a > 0.5 && b > 0.5 ? 1 : 0);
		}
		return { out };
	},
});

/**
 * Logical OR - outputs 1 if either input is > 0.5, 0 otherwise.
 *
 * @example
 * ```javascript
 * // Play in bars 0-4 OR bars 12-16
 * let playHere = or(lt(bars).than(4)).with(gte(bars).than(12))
 * ```
 */
export const or = device({
	inputs: inputs({ input: 0, with: 0 }),
	outputs: ["out"],
	defaultInput: "input",
	defaultOutput: "out",
	process(inp, _cfg, _state, _sampleRate) {
		const inputSig = inp.input ?? [0];
		const withSig = inp.with ?? [0];
		const numChannels = Math.max(inputSig.length, withSig.length);
		const out: number[] = [];
		for (let c = 0; c < numChannels; c++) {
			const a = inputSig[c % inputSig.length] ?? 0;
			const b = withSig[c % withSig.length] ?? 0;
			out.push(a > 0.5 || b > 0.5 ? 1 : 0);
		}
		return { out };
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
		const inputSig = inp.input ?? [0];
		const out = inputSig.map((v) => (v > 0.5 ? 0 : 1));
		return { out };
	},
});
