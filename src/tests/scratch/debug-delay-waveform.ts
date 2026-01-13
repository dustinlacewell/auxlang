/**
 * Trace actual waveform amplitude to see the "WOOOOOOO"
 * Output ASCII waveform visualization
 */

import { parseExpr } from "../../core2/devices/seq/expr/parse";
import { countBeats } from "../../core2/devices/seq/expr/traverse";
import {
	createMonoTraversalState,
	traverseMono,
	clearMonoProbDecisions,
} from "../../core2/devices/seq/mono-traverse";

function simulate() {
	const sampleRate = 48000;
	const bpm = 60;

	// Sequencer state
	const pattern = "c4 ~ ~ ~";
	const expr = parseExpr(pattern);
	const totalBeats = countBeats(expr);
	const seqState = createMonoTraversalState();
	const samplesPerBeat = (60 / bpm) * sampleRate;

	// ADSR state (using defaults from the device)
	const attack = 0.01, decay = 0.3, sustain = 0.5, release = 0.1;
	let adsrValue = 0;
	let adsrPhase: "off" | "attack" | "decay" | "sustain" | "release" = "off";
	let lastGate = 0;

	// Oscillator state
	let oscPhase = 0;

	// Delay state
	const delayTime = 0.23;
	const feedback = 0.1;
	const mix = 0.5;
	const maxDelaySamples = Math.ceil(2 * sampleRate);
	const delayBuffer = new Float32Array(maxDelaySamples);
	let delayWriteIdx = 0;
	const delaySamples = Math.floor(delayTime * sampleRate);

	// Clock state
	let beatIndex = 0;
	let sampleInBeat = 0;

	const totalDuration = 4 * sampleRate;
	const outputs: number[] = [];

	for (let i = 0; i < totalDuration; i++) {
		// Clock tick
		if (sampleInBeat >= samplesPerBeat) {
			sampleInBeat = 0;
			beatIndex++;
			if (beatIndex >= totalBeats) {
				beatIndex = 0;
				clearMonoProbDecisions(seqState);
			}
		}
		const phase = sampleInBeat / samplesPerBeat;

		// Sequencer
		const seqOut = traverseMono(expr, { beatIndex, phase, cycle: 0, totalBeats }, seqState);
		const freq = seqOut.cv;
		const gate = seqOut.gate;

		// ADSR
		const dt = 1 / sampleRate;
		if (gate === 1 && lastGate === 0) {
			adsrPhase = "attack";
		} else if (gate === 0 && lastGate === 1) {
			adsrPhase = "release";
		}
		lastGate = gate;

		if (adsrPhase === "attack") {
			adsrValue += dt / attack;
			if (adsrValue >= 1) { adsrValue = 1; adsrPhase = "decay"; }
		} else if (adsrPhase === "decay") {
			adsrValue -= dt / decay * (1 - sustain);
			if (adsrValue <= sustain) { adsrValue = sustain; adsrPhase = "sustain"; }
		} else if (adsrPhase === "sustain") {
			// hold
		} else if (adsrPhase === "release") {
			adsrValue -= dt / release * sustain;
			if (adsrValue < 0.001) { adsrValue = 0; adsrPhase = "off"; }
		}

		// Oscillator (sin)
		oscPhase = (oscPhase + freq / sampleRate) % 1;
		const osc = Math.sin(oscPhase * Math.PI * 2);

		// Gain
		const gained = osc * adsrValue;

		// Delay
		let readIdx = delayWriteIdx - delaySamples;
		if (readIdx < 0) readIdx += maxDelaySamples;
		const delayed = delayBuffer[readIdx];
		delayBuffer[delayWriteIdx] = gained + delayed * feedback;
		delayWriteIdx = (delayWriteIdx + 1) % maxDelaySamples;

		const output = gained * (1 - mix) + delayed * mix;
		outputs.push(output);

		sampleInBeat++;
	}

	// Visualize amplitude envelope (RMS over 10ms windows)
	const windowMs = 10;
	const windowSamples = Math.floor(windowMs / 1000 * sampleRate);
	const rmsValues: number[] = [];

	for (let start = 0; start < outputs.length; start += windowSamples) {
		const end = Math.min(start + windowSamples, outputs.length);
		let sum = 0;
		for (let i = start; i < end; i++) {
			sum += outputs[i] * outputs[i];
		}
		rmsValues.push(Math.sqrt(sum / (end - start)));
	}

	// ASCII waveform
	console.log("Amplitude envelope (each char = 10ms, height = RMS amplitude):\n");
	const maxRms = Math.max(...rmsValues);
	const height = 20;

	for (let row = height; row >= 0; row--) {
		const threshold = (row / height) * maxRms;
		let line = row === 0 ? "0.0 |" : row === height ? `${maxRms.toFixed(2).padStart(4)}|` : "    |";
		for (const rms of rmsValues) {
			line += rms >= threshold ? "█" : " ";
		}
		console.log(line);
	}

	// Time axis
	let axis = "    +";
	for (let i = 0; i < rmsValues.length; i++) {
		axis += (i % 100 === 0) ? "|" : "-";
	}
	console.log(axis);
	console.log("     0s        1s        2s        3s        4s");

	// Also print numerical RMS per 250ms
	console.log("\nRMS per 250ms:");
	const bigWindow = Math.floor(0.25 * sampleRate);
	for (let w = 0; w < 16; w++) {
		const start = w * bigWindow;
		const end = Math.min(start + bigWindow, outputs.length);
		if (start >= outputs.length) break;
		let sum = 0;
		for (let i = start; i < end; i++) sum += outputs[i] * outputs[i];
		const rms = Math.sqrt(sum / (end - start));
		console.log(`  ${(w * 250).toString().padStart(4)}ms: ${rms.toFixed(6)} ${"█".repeat(Math.floor(rms / maxRms * 40))}`);
	}
}

simulate();
