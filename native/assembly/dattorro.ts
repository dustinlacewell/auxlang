/**
 * Dattorro Plate Reverb
 *
 * Based on Jon Dattorro's "Effect Design Part 1: Reverberator and Other Filters"
 * and the working implementation from https://github.com/khoin/DattorroReverbNode
 *
 * This is a high-quality plate reverb with:
 * - Pre-delay
 * - Input diffusion (4 allpass filters)
 * - Dual tank with cross-feedback
 * - Modulated delay lines
 * - Multi-tap output for rich stereo field
 */

// Delay line sizes in seconds (at 48kHz reference)
const DELAY_TIMES: StaticArray<f32> = [
	0.004771345, 0.003595309, 0.012734787, 0.009307483,
	0.022579886, 0.149625349, 0.060481839, 0.1249958,
	0.030509727, 0.141695508, 0.089244313, 0.106280031,
];

// Output tap positions in seconds
const TAP_TIMES: StaticArray<f32> = [
	0.008937872, 0.099929438, 0.064278754, 0.067067639,
	0.066866033, 0.006283391, 0.035818689, 0.011861161,
	0.121870905, 0.041262054, 0.08981553, 0.070931756,
	0.011256342, 0.004065724,
];

class DelayLine {
	buffer: StaticArray<f32>;
	mask: i32;
	writePos: i32 = 0;
	readPos: i32 = 0;
	length: i32;

	constructor(lengthSamples: i32) {
		// Round up to next power of 2 for efficient masking
		let size = 1;
		while (size < lengthSamples) size <<= 1;

		this.buffer = new StaticArray<f32>(size);
		this.mask = size - 1;
		this.length = lengthSamples;
		this.readPos = 0;
		this.writePos = lengthSamples - 1;

		for (let i = 0; i < size; i++) {
			unchecked((this.buffer[i] = 0));
		}
	}

	@inline
	write(value: f32): f32 {
		unchecked((this.buffer[this.writePos] = value));
		return value;
	}

	@inline
	read(): f32 {
		return unchecked(this.buffer[this.readPos]);
	}

	@inline
	readAt(offset: i32): f32 {
		return unchecked(this.buffer[(this.readPos + offset) & this.mask]);
	}

	// Cubic interpolation for modulated reads
	@inline
	readCubic(offset: f32): f32 {
		const int = <i32>offset;
		const frac = offset - <f32>int;

		let idx = this.readPos + int - 1;
		const x0 = unchecked(this.buffer[idx++ & this.mask]);
		const x1 = unchecked(this.buffer[idx++ & this.mask]);
		const x2 = unchecked(this.buffer[idx++ & this.mask]);
		const x3 = unchecked(this.buffer[idx & this.mask]);

		const a = (3.0 * (x1 - x2) - x0 + x3) * 0.5;
		const b = 2.0 * x2 + x0 - (5.0 * x1 + x3) * 0.5;
		const c = (x2 - x0) * 0.5;

		return <f32>((((a * frac) + b) * frac + c) * frac + x1);
	}

	@inline
	advance(): void {
		this.writePos = (this.writePos + 1) & this.mask;
		this.readPos = (this.readPos + 1) & this.mask;
	}

	clear(): void {
		for (let i = 0; i <= this.mask; i++) {
			unchecked((this.buffer[i] = 0));
		}
	}
}

export class Dattorro {
	// Delay lines (12 total)
	private delays: StaticArray<DelayLine> = new StaticArray<DelayLine>(12);

	// Pre-delay
	private preDelay: StaticArray<f32> = new StaticArray<f32>(1);
	private preDelayLength: i32 = 0;
	private preDelayWrite: i32 = 0;
	private preDelayTime: i32 = 0;

	// Lowpass filter states
	private lp1: f32 = 0;
	private lp2: f32 = 0;
	private lp3: f32 = 0;

	// Modulation
	private excPhase: f32 = 0;

	// Output taps (in samples)
	private taps: StaticArray<i32> = new StaticArray<i32>(14);

	// Parameters
	private bandwidth: f32 = 0.9999;
	private inputDiffusion1: f32 = 0.75;
	private inputDiffusion2: f32 = 0.625;
	private decayDiffusion1: f32 = 0.7;
	private decayDiffusion2: f32 = 0.5;
	private damping: f32 = 0.005;
	private decay: f32 = 0.5;
	private excursionRate: f32 = 0.5;
	private excursionDepth: f32 = 0.7;
	private mix: f32 = 0.3;

	private sampleRate: f32;

	constructor(sampleRate: f32 = 48000.0) {
		this.sampleRate = sampleRate;

		// Create pre-delay (1 second max)
		this.preDelayLength = <i32>sampleRate;
		this.preDelay = new StaticArray<f32>(this.preDelayLength);
		for (let i = 0; i < this.preDelayLength; i++) {
			unchecked((this.preDelay[i] = 0));
		}

		// Create delay lines
		for (let i = 0; i < 12; i++) {
			const lengthSamples = <i32>(unchecked(DELAY_TIMES[i]) * sampleRate);
			unchecked((this.delays[i] = new DelayLine(lengthSamples)));
		}

		// Create tap positions
		for (let i = 0; i < 14; i++) {
			unchecked((this.taps[i] = <i32>(unchecked(TAP_TIMES[i]) * sampleRate)));
		}
	}

	setSize(value: f32): void {
		// Size controls decay (0-1 maps to 0.1-0.9 for safety)
		this.decay = 0.1 + value * 0.8;
	}

	setDamping(value: f32): void {
		// Higher value = more damping = less high frequencies
		this.damping = value * 0.5;
	}

	setMix(value: f32): void {
		this.mix = value;
	}

	@inline
	processMono(input: f32): f32 {
		const fi = this.inputDiffusion1;
		const si = this.inputDiffusion2;
		const dc = this.decay;
		const ft = this.decayDiffusion1;
		const st = this.decayDiffusion2;
		const dp = 1.0 - this.damping; // damping pass-through
		const bw = this.bandwidth;

		// Excursion parameters
		const ex = this.excursionRate / this.sampleRate;
		const ed = (this.excursionDepth * this.sampleRate) / 1000.0;

		// Write to pre-delay
		unchecked(
			(this.preDelay[this.preDelayWrite] = input),
		);

		// Read from pre-delay with bandwidth filter
		let pdRead =
			this.preDelayWrite - this.preDelayTime + this.preDelayLength;
		pdRead = pdRead % this.preDelayLength;
		this.lp1 += bw * (unchecked(this.preDelay[pdRead]) - this.lp1);

		// Advance pre-delay write position
		this.preDelayWrite = (this.preDelayWrite + 1) % this.preDelayLength;

		// Pre-tank: 4 cascaded allpass diffusors
		// Allpass structure: write = input - g*delay_out; output = delay_out + g*write
		let pre = unchecked(this.delays[0]).write(
			this.lp1 - fi * unchecked(this.delays[0]).read(),
		);
		pre = unchecked(this.delays[1]).write(
			fi * (pre - unchecked(this.delays[1]).read()) +
				unchecked(this.delays[0]).read(),
		);
		pre = unchecked(this.delays[2]).write(
			fi * pre +
				unchecked(this.delays[1]).read() -
				si * unchecked(this.delays[2]).read(),
		);
		pre = unchecked(this.delays[3]).write(
			si * (pre - unchecked(this.delays[3]).read()) +
				unchecked(this.delays[2]).read(),
		);

		const split = si * pre + unchecked(this.delays[3]).read();

		// Modulation excursions
		const exc = ed * (1.0 + Mathf.cos(this.excPhase * 6.28));
		const exc2 = ed * (1.0 + Mathf.sin(this.excPhase * 6.2847));

		// Left tank loop
		let temp = unchecked(this.delays[4]).write(
			split +
				dc * unchecked(this.delays[11]).read() +
				ft * unchecked(this.delays[4]).readCubic(exc),
		);
		unchecked(this.delays[5]).write(
			unchecked(this.delays[4]).readCubic(exc) - ft * temp,
		);
		this.lp2 += <f32>(dp * (unchecked(this.delays[5]).read() - this.lp2));
		temp = unchecked(this.delays[6]).write(
			dc * this.lp2 - st * unchecked(this.delays[6]).read(),
		);
		unchecked(this.delays[7]).write(
			unchecked(this.delays[6]).read() + st * temp,
		);

		// Right tank loop
		temp = unchecked(this.delays[8]).write(
			split +
				dc * unchecked(this.delays[7]).read() +
				ft * unchecked(this.delays[8]).readCubic(exc2),
		);
		unchecked(this.delays[9]).write(
			unchecked(this.delays[8]).readCubic(exc2) - ft * temp,
		);
		this.lp3 += <f32>(dp * (unchecked(this.delays[9]).read() - this.lp3));
		temp = unchecked(this.delays[10]).write(
			dc * this.lp3 - st * unchecked(this.delays[10]).read(),
		);
		unchecked(this.delays[11]).write(
			unchecked(this.delays[10]).read() + st * temp,
		);

		// Output taps
		let lo: f32 = 0;
		let ro: f32 = 0;

		lo += unchecked(this.delays[9]).readAt(unchecked(this.taps[0]));
		lo += unchecked(this.delays[9]).readAt(unchecked(this.taps[1]));
		lo -= unchecked(this.delays[10]).readAt(unchecked(this.taps[2]));
		lo += unchecked(this.delays[11]).readAt(unchecked(this.taps[3]));
		lo -= unchecked(this.delays[5]).readAt(unchecked(this.taps[4]));
		lo -= unchecked(this.delays[6]).readAt(unchecked(this.taps[5]));
		lo -= unchecked(this.delays[7]).readAt(unchecked(this.taps[6]));

		ro += unchecked(this.delays[5]).readAt(unchecked(this.taps[7]));
		ro += unchecked(this.delays[5]).readAt(unchecked(this.taps[8]));
		ro -= unchecked(this.delays[6]).readAt(unchecked(this.taps[9]));
		ro += unchecked(this.delays[7]).readAt(unchecked(this.taps[10]));
		ro -= unchecked(this.delays[9]).readAt(unchecked(this.taps[11]));
		ro -= unchecked(this.delays[10]).readAt(unchecked(this.taps[12]));
		ro -= unchecked(this.delays[11]).readAt(unchecked(this.taps[13]));

		// Advance modulation
		this.excPhase += ex;

		// Advance all delay lines
		for (let i = 0; i < 12; i++) {
			unchecked(this.delays[i]).advance();
		}

		// Mix to mono output (crossfade between dry and wet)
		const wetMono = (lo + ro) * 0.5 * 0.6;
		return wetMono * this.mix + input * (1 - this.mix);
	}

	clear(): void {
		for (let i = 0; i < 12; i++) {
			unchecked(this.delays[i]).clear();
		}
		for (let i = 0; i < this.preDelayLength; i++) {
			unchecked((this.preDelay[i] = 0));
		}
		this.lp1 = 0;
		this.lp2 = 0;
		this.lp3 = 0;
		this.excPhase = 0;
	}

	// State serialization for live re-eval
	// Returns total size needed for state buffer
	getStateSize(): i32 {
		let size = 0;
		// Scalar state: lp1, lp2, lp3, excPhase, preDelayWrite (5 floats)
		size += 5;
		// Pre-delay buffer
		size += this.preDelayLength;
		// 12 delay lines: each has writePos, readPos, then buffer
		for (let i = 0; i < 12; i++) {
			const d = unchecked(this.delays[i]);
			size += 2; // writePos, readPos as floats
			size += d.mask + 1; // buffer size (power of 2)
		}
		return size;
	}

	// Serialize state into provided buffer, returns bytes written
	serializeState(buf: StaticArray<f32>): i32 {
		let idx = 0;

		// Scalar state
		unchecked(buf[idx++] = this.lp1);
		unchecked(buf[idx++] = this.lp2);
		unchecked(buf[idx++] = this.lp3);
		unchecked(buf[idx++] = this.excPhase);
		unchecked(buf[idx++] = <f32>this.preDelayWrite);

		// Pre-delay buffer
		for (let i = 0; i < this.preDelayLength; i++) {
			unchecked(buf[idx++] = this.preDelay[i]);
		}

		// 12 delay lines
		for (let i = 0; i < 12; i++) {
			const d = unchecked(this.delays[i]);
			unchecked(buf[idx++] = <f32>d.writePos);
			unchecked(buf[idx++] = <f32>d.readPos);
			const bufSize = d.mask + 1;
			for (let j = 0; j < bufSize; j++) {
				unchecked(buf[idx++] = d.buffer[j]);
			}
		}

		return idx;
	}

	// Deserialize state from buffer
	deserializeState(buf: StaticArray<f32>): void {
		let idx = 0;

		// Scalar state
		this.lp1 = unchecked(buf[idx++]);
		this.lp2 = unchecked(buf[idx++]);
		this.lp3 = unchecked(buf[idx++]);
		this.excPhase = unchecked(buf[idx++]);
		this.preDelayWrite = <i32>unchecked(buf[idx++]);

		// Pre-delay buffer
		for (let i = 0; i < this.preDelayLength; i++) {
			unchecked(this.preDelay[i] = buf[idx++]);
		}

		// 12 delay lines
		for (let i = 0; i < 12; i++) {
			const d = unchecked(this.delays[i]);
			d.writePos = <i32>unchecked(buf[idx++]);
			d.readPos = <i32>unchecked(buf[idx++]);
			const bufSize = d.mask + 1;
			for (let j = 0; j < bufSize; j++) {
				unchecked(d.buffer[j] = buf[idx++]);
			}
		}
	}
}
