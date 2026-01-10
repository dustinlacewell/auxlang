/**
 * State Variable Filter (SVF)
 *
 * A modern, stable filter design that provides simultaneous lowpass,
 * highpass, bandpass, and notch outputs from a single calculation.
 *
 * Based on Andrew Simper's (Cytomic) SVF design which is:
 * - Stable at high resonance
 * - Well-behaved with audio-rate modulation
 * - Efficient (no trig functions per sample when params are stable)
 *
 * Reference: https://cytomic.com/files/dsp/SvfLinearTrapOptimised2.pdf
 */

// Filter modes
export const MODE_LOWPASS: i32 = 0;
export const MODE_HIGHPASS: i32 = 1;
export const MODE_BANDPASS: i32 = 2;
export const MODE_NOTCH: i32 = 3;

export class SVF {
	// Filter state
	private ic1eq: f32 = 0;
	private ic2eq: f32 = 0;

	// Coefficients (computed from cutoff/resonance)
	private g: f32 = 0;
	private k: f32 = 0;
	private a1: f32 = 0;
	private a2: f32 = 0;
	private a3: f32 = 0;

	// Current parameters
	private cutoff: f32 = 1000;
	private resonance: f32 = 0;
	private mode: i32 = MODE_LOWPASS;
	private sampleRate: f32;

	// Cached for coefficient update check
	private lastCutoff: f32 = -1;
	private lastResonance: f32 = -1;

	constructor(sampleRate: f32 = 48000.0) {
		this.sampleRate = sampleRate;
		this.updateCoefficients();
	}

	private updateCoefficients(): void {
		// Clamp cutoff to safe range
		let freq = this.cutoff;
		if (freq < 20.0) freq = 20.0;
		if (freq > this.sampleRate * 0.49) freq = this.sampleRate * 0.49;

		// g = tan(pi * fc / fs)
		// Using approximation for efficiency: tan(x) ≈ x for small x
		// For better accuracy at high frequencies, use the real tan
		const wd: f32 = <f32>(2.0 * 3.14159265359) * freq;
		const wa: f32 = (2.0 * this.sampleRate) * Mathf.tan(wd / (2.0 * this.sampleRate));
		this.g = <f32>(wa / (2.0 * this.sampleRate));

		// k = 2 - 2*resonance (resonance 0-1 maps to k 2-0)
		// k controls damping: k=2 is no resonance, k=0 is self-oscillation
		this.k = 2.0 - this.resonance * 1.9; // Don't go all the way to 0

		// Precompute coefficients
		this.a1 = 1.0 / (1.0 + this.g * (this.g + this.k));
		this.a2 = this.g * this.a1;
		this.a3 = this.g * this.a2;

		this.lastCutoff = this.cutoff;
		this.lastResonance = this.resonance;
	}

	setCutoff(freq: f32): void {
		this.cutoff = freq;
	}

	setResonance(res: f32): void {
		this.resonance = res;
	}

	setMode(mode: i32): void {
		this.mode = mode;
	}

	@inline
	process(input: f32): f32 {
		// Update coefficients if parameters changed
		if (this.cutoff !== this.lastCutoff || this.resonance !== this.lastResonance) {
			this.updateCoefficients();
		}

		// Tick the filter
		const v3 = input - this.ic2eq;
		const v1 = this.a1 * this.ic1eq + this.a2 * v3;
		const v2 = this.ic2eq + this.a2 * this.ic1eq + this.a3 * v3;

		this.ic1eq = 2.0 * v1 - this.ic1eq;
		this.ic2eq = 2.0 * v2 - this.ic2eq;

		// Output based on mode
		if (this.mode === MODE_LOWPASS) {
			return v2;
		} else if (this.mode === MODE_HIGHPASS) {
			return input - this.k * v1 - v2;
		} else if (this.mode === MODE_BANDPASS) {
			return v1;
		} else {
			// Notch = LP + HP
			return input - this.k * v1;
		}
	}

	clear(): void {
		this.ic1eq = 0;
		this.ic2eq = 0;
	}

	// State serialization for live re-eval
	getIc1eq(): f32 {
		return this.ic1eq;
	}

	getIc2eq(): f32 {
		return this.ic2eq;
	}

	setIc1eq(v: f32): void {
		this.ic1eq = v;
	}

	setIc2eq(v: f32): void {
		this.ic2eq = v;
	}
}
