/**
 * Tape Delay
 *
 * A warm, analog-style delay with tape machine characteristics:
 * - Wow (slow pitch drift ~0.5Hz)
 * - Flutter (fast pitch wobble ~6Hz)
 * - Saturation in the feedback path
 * - High-frequency roll-off (darker repeats)
 *
 * Inspired by classic tape echoes like the Roland RE-201
 */

// Maximum delay time in seconds
const MAX_DELAY_TIME: f32 = 2.0;

export class TapeDelay {
	// Delay buffer (power of 2 for efficient masking)
	private buffer: StaticArray<f32>;
	private bufferSize: i32;
	private bufferMask: i32;
	private writePos: i32 = 0;

	// Parameters
	private delayTime: f32 = 0.3; // seconds
	private feedback: f32 = 0.4;
	private mix: f32 = 0.5;
	private wowDepth: f32 = 0.002; // 2ms modulation depth (in seconds)
	private flutterDepth: f32 = 0.0003; // 0.3ms flutter depth (in seconds)
	private saturation: f32 = 0.3;
	private tone: f32 = 0.7; // lowpass in feedback (0=dark, 1=bright)
	private age: f32 = 0.0; // tape wear (adds noise)

	// Modulation oscillators
	private wowPhase: f32 = 0;
	private wowRate: f32 = 0.4; // Hz
	private flutterPhase: f32 = 0;
	private flutterRate: f32 = 5.0; // Hz

	// Lowpass filter state for tone control
	private lpState: f32 = 0;

	// Random state for subtle variation
	private randomState: u32 = 12345;
	private smoothedRandom: f32 = 0;

	private sampleRate: f32;

	constructor(sampleRate: f32 = 48000.0) {
		this.sampleRate = sampleRate;

		// Allocate buffer for max delay time (round up to power of 2)
		const maxSamples = <i32>(MAX_DELAY_TIME * sampleRate) + 1024;
		let size = 1;
		while (size < maxSamples) size <<= 1;

		this.buffer = new StaticArray<f32>(size);
		this.bufferSize = size;
		this.bufferMask = size - 1;

		// Clear buffer
		for (let i = 0; i < size; i++) {
			unchecked((this.buffer[i] = 0));
		}
	}

	// Simple pseudo-random number generator (0 to 1)
	@inline
	private random(): f32 {
		this.randomState = this.randomState * 1103515245 + 12345;
		return <f32>((this.randomState >> 16) & 0x7fff) / 32767.0;
	}

	// Soft saturation using tanh approximation
	@inline
	private saturate(x: f32): f32 {
		const amount = this.saturation;
		if (amount < 0.001) return x;

		// Soft clip with adjustable drive
		const drive: f32 = 1.0 + amount * 3.0;
		const driven = x * drive;
		// tanh approximation: x / (1 + |x|)
		const result = driven / (1.0 + Mathf.abs(driven));
		// Compensate for gain reduction
		return result / drive * (1.0 + amount * 0.5);
	}

	// Linear interpolation for fractional delay reads
	@inline
	private readInterpolated(delaySamples: f32): f32 {
		// Ensure minimum delay of 1 sample
		if (delaySamples < 1.0) delaySamples = 1.0;

		const intDelay = <i32>Mathf.floor(delaySamples);
		const frac = delaySamples - <f32>intDelay;

		// Calculate read position - go back from current write position
		// Use modulo instead of mask to handle negative numbers correctly
		let pos0 = this.writePos - intDelay;
		while (pos0 < 0) pos0 += this.bufferSize;
		pos0 = pos0 & this.bufferMask;

		let pos1 = this.writePos - intDelay - 1;
		while (pos1 < 0) pos1 += this.bufferSize;
		pos1 = pos1 & this.bufferMask;

		const s0 = unchecked(this.buffer[pos0]);
		const s1 = unchecked(this.buffer[pos1]);

		// Standard linear interpolation: (1-frac)*s0 + frac*s1
		return s0 + frac * (s1 - s0);
	}

	setTime(value: f32): void {
		if (value < 0.001) value = 0.001;
		if (value > MAX_DELAY_TIME) value = MAX_DELAY_TIME;
		this.delayTime = value;
	}

	setFeedback(value: f32): void {
		if (value < 0) value = 0;
		if (value > 0.95) value = 0.95;
		this.feedback = value;
	}

	setMix(value: f32): void {
		if (value < 0) value = 0;
		if (value > 1) value = 1;
		this.mix = value;
	}

	setWow(value: f32): void {
		if (value < 0) value = 0;
		if (value > 1) value = 1;
		// 0-1 maps to 0-4ms of wow depth
		this.wowDepth = value * 0.004;
	}

	setFlutter(value: f32): void {
		if (value < 0) value = 0;
		if (value > 1) value = 1;
		// 0-1 maps to 0-0.8ms of flutter depth
		this.flutterDepth = value * 0.0008;
	}

	setSaturation(value: f32): void {
		if (value < 0) value = 0;
		if (value > 1) value = 1;
		this.saturation = value;
	}

	setTone(value: f32): void {
		if (value < 0) value = 0;
		if (value > 1) value = 1;
		this.tone = value;
	}

	setAge(value: f32): void {
		if (value < 0) value = 0;
		if (value > 1) value = 1;
		this.age = value;
	}

	@inline
	process(input: f32): f32 {
		const sr = this.sampleRate;

		// Smooth random for organic modulation (updated slowly)
		this.smoothedRandom += 0.0001 * (this.random() - 0.5 - this.smoothedRandom * 0.1);

		// Calculate wow modulation (slow sine)
		const wowMod = Mathf.sin(this.wowPhase * 6.283185307) * this.wowDepth;
		this.wowPhase += this.wowRate / sr;
		if (this.wowPhase >= 1.0) this.wowPhase -= 1.0;

		// Calculate flutter modulation (faster, with slight randomness)
		const flutterBase = Mathf.sin(this.flutterPhase * 6.283185307);
		const flutterMod = (flutterBase + this.smoothedRandom * 0.3) * this.flutterDepth;
		this.flutterPhase += this.flutterRate / sr;
		if (this.flutterPhase >= 1.0) this.flutterPhase -= 1.0;

		// Calculate modulated delay time in samples
		const modulatedTime = this.delayTime + wowMod + flutterMod;
		const delaySamples = modulatedTime * sr;

		// Read from delay line with interpolation
		let delayed = this.readInterpolated(delaySamples);

		// Apply tone control (lowpass filter in feedback path)
		// tone=0 means heavy filtering (dark), tone=1 means minimal filtering (bright)
		// Coefficient between 0.1 (very dark) and 1.0 (bright)
		const lpCoeff: f32 = 0.1 + this.tone * 0.9;
		this.lpState = this.lpState + lpCoeff * (delayed - this.lpState);
		const filtered = this.lpState;

		// Apply saturation to the filtered delayed signal
		const saturated = this.saturate(filtered);

		// Add age-based noise (very subtle)
		let withNoise = saturated;
		if (this.age > 0.01) {
			withNoise += (this.random() - 0.5) * this.age * 0.005;
		}

		// Write to buffer: input + feedback * processed delay
		const toWrite = input + withNoise * this.feedback;
		unchecked((this.buffer[this.writePos] = toWrite));

		// Advance write position
		this.writePos = (this.writePos + 1) & this.bufferMask;

		// Mix dry/wet
		return input * (1.0 - this.mix) + withNoise * this.mix;
	}

	clear(): void {
		for (let i = 0; i < this.bufferSize; i++) {
			unchecked((this.buffer[i] = 0));
		}
		this.lpState = 0;
		this.wowPhase = 0;
		this.flutterPhase = 0;
		this.smoothedRandom = 0;
	}
}
