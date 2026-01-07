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
		const a = inp.a ?? 0;
		const b = inp.b ?? 1;
		return { out: a * b };
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
		const a = inp.a ?? 0;
		const b = inp.b ?? 0;
		return { out: a - b };
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
		const input = inp.input ?? 0;
		const min = inp.min ?? -1;
		const max = inp.max ?? 1;
		return { out: Math.max(min, Math.min(max, input)) };
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
		const input = inp.input ?? 0;
		const inMin = inp.inMin ?? -1;
		const inMax = inp.inMax ?? 1;
		const outMin = inp.outMin ?? 0;
		const outMax = inp.outMax ?? 1;

		// Normalize to 0-1
		const normalized = (input - inMin) / (inMax - inMin);
		// Scale to output range
		return { out: outMin + normalized * (outMax - outMin) };
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
		const input = inp.input ?? 0;
		return { out: Math.abs(input) };
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
		const input = inp.input ?? 0;
		return { out: -input };
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
		const a = inp.a ?? 0;
		const b = inp.b ?? 1;
		// Avoid division by zero
		return { out: b === 0 ? 0 : a / b };
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
		const a = inp.a ?? 0;
		const b = inp.b ?? 1;
		return { out: b === 0 ? 0 : a % b };
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
		const a = inp.a ?? 0;
		const b = inp.b ?? 0;
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
		const a = inp.a ?? 0;
		const b = inp.b ?? 0;
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
		const a = inp.a ?? 0;
		const b = inp.b ?? 0;
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
		const a = inp.a ?? 0;
		const b = inp.b ?? 0;
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
		const a = inp.a ?? 0;
		const b = inp.b ?? 0;
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
		const input = inp.input ?? 0;
		return { out: input > 0.5 ? 0 : 1 };
	},
});
