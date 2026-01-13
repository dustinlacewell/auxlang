/**
 * Simulate: sin -> adsr -> delay(0.1 feedback) -> out
 * Why does it go "Bom bom WOOOOOOO"?
 */

function simulate() {
	const sampleRate = 48000;
	const bpm = 60;
	const beatDuration = 60 / bpm; // 1 second per beat

	// ADSR params (defaults)
	const attack = 0.01;
	const decay = 0.3;
	const sustain = 0.5;
	const release = 0.1;

	// Delay params
	const delayTime = 0.23;
	const feedback = 0.1;
	const mix = 0.5;

	// Pattern: c4 ~ ~ ~ means gate ON for beat 0, OFF for beats 1-3
	// At 60 BPM, beat 0 = 0-1s, beat 1 = 1-2s, etc.
	const gateOnDuration = beatDuration; // Gate stays on for 1 beat = 1 second

	// Delay state
	const maxDelaySamples = Math.ceil(2 * sampleRate);
	const delayBuffer = new Float32Array(maxDelaySamples);
	let delayWriteIdx = 0;
	const delaySamples = Math.floor(delayTime * sampleRate);

	// ADSR state
	let adsrPhase: "attack" | "decay" | "sustain" | "release" | "off" = "off";
	let adsrValue = 0;
	let adsrTime = 0;
	let gateWasOn = false;

	// Oscillator state
	let oscPhase = 0;
	const freq = 261.63; // C4

	const totalDuration = 4 * sampleRate; // 4 seconds
	const outputs: number[] = [];

	for (let i = 0; i < totalDuration; i++) {
		const t = i / sampleRate;

		// Gate: ON for first second, OFF after
		const gate = t < gateOnDuration ? 1 : 0;

		// ADSR
		if (gate === 1 && !gateWasOn) {
			adsrPhase = "attack";
			adsrTime = 0;
		} else if (gate === 0 && gateWasOn) {
			adsrPhase = "release";
			adsrTime = 0;
		}
		gateWasOn = gate === 1;

		const dt = 1 / sampleRate;
		if (adsrPhase === "attack") {
			adsrValue += dt / attack;
			if (adsrValue >= 1) {
				adsrValue = 1;
				adsrPhase = "decay";
				adsrTime = 0;
			}
		} else if (adsrPhase === "decay") {
			adsrValue -= dt / decay * (1 - sustain);
			if (adsrValue <= sustain) {
				adsrValue = sustain;
				adsrPhase = "sustain";
			}
		} else if (adsrPhase === "release") {
			adsrValue -= dt / release * adsrValue;
			if (adsrValue < 0.0001) {
				adsrValue = 0;
				adsrPhase = "off";
			}
		}

		// Oscillator
		oscPhase = (oscPhase + freq / sampleRate) % 1;
		const osc = Math.sin(oscPhase * Math.PI * 2);

		// Gain (osc * adsr)
		const gained = osc * adsrValue;

		// Delay
		let readIdx = delayWriteIdx - delaySamples;
		if (readIdx < 0) readIdx += maxDelaySamples;

		const delayed = delayBuffer[readIdx];
		delayBuffer[delayWriteIdx] = gained + delayed * feedback;
		delayWriteIdx = (delayWriteIdx + 1) % maxDelaySamples;

		const output = gained * (1 - mix) + delayed * mix;
		outputs.push(output);
	}

	// Analyze output
	console.log("Output analysis (RMS per 250ms window):");
	const windowSize = Math.floor(0.25 * sampleRate);
	for (let w = 0; w < 16; w++) {
		const start = w * windowSize;
		const end = Math.min(start + windowSize, outputs.length);
		if (start >= outputs.length) break;

		let sum = 0;
		let peak = 0;
		for (let i = start; i < end; i++) {
			sum += outputs[i] * outputs[i];
			peak = Math.max(peak, Math.abs(outputs[i]));
		}
		const rms = Math.sqrt(sum / (end - start));
		const timeMs = (start / sampleRate * 1000).toFixed(0);
		console.log(`  ${timeMs}ms: RMS=${rms.toFixed(6)}, peak=${peak.toFixed(6)}`);
	}

	// Check for lingering signal after 2 seconds
	console.log("\nLast second analysis:");
	const lastSecond = outputs.slice(-sampleRate);
	let lastRms = 0;
	for (const v of lastSecond) lastRms += v * v;
	lastRms = Math.sqrt(lastRms / lastSecond.length);
	const lastPeak = Math.max(...lastSecond.map(Math.abs));
	console.log(`  RMS=${lastRms.toExponential(4)}, peak=${lastPeak.toExponential(4)}`);
}

simulate();
