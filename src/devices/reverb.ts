import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

/**
 * Freeverb-style algorithmic reverb.
 *
 * Uses a WASM implementation for performance when available,
 * with a JS fallback for compatibility.
 *
 * Architecture: 8 parallel comb filters → 4 series allpass filters
 *
 * Inputs:
 * - input: Audio signal to process
 * - room: Room size (0-1), controls reverb tail length
 * - damp: Damping (0-1), high-frequency absorption
 * - wet: Wet level (0-1), amount of reverb
 * - dry: Dry level (0-1), amount of original signal
 *
 * Example:
 *   reverb(synth).room(0.8).damp(0.3).wet(0.4).dry(0.6)
 */
export const reverb = device({
	inputs: inputs({ input: 0, room: 0.5, damp: 0.5, wet: 0.33, dry: 0.7 }),
	outputs: ["out"],
	defaultInput: "input",
	defaultOutput: "out",
	wasmUrl: "/reverb.wasm",
	process(inp, _cfg, state, sampleRate) {
		const inputSig = inp.input ?? [0];
		const room = (inp.room ?? [0.5])[0] ?? 0.5;
		const damp = (inp.damp ?? [0.5])[0] ?? 0.5;
		const wet = (inp.wet ?? [0.33])[0] ?? 0.33;
		const dry = (inp.dry ?? [0.7])[0] ?? 0.7;

		// Sum input channels to mono
		let monoInput = 0;
		for (let i = 0; i < inputSig.length; i++) {
			monoInput += inputSig[i] ?? 0;
		}
		monoInput /= inputSig.length;

		// Try to use WASM reverb if available
		// biome-ignore lint/suspicious/noExplicitAny: globalThis typing in worklet
		const g = globalThis as any;
		if (g.__nativeReverb) {
			// Initialize WASM reverb on first call
			if (!state.wasmInitialized) {
				state.wasmInitialized = true;
				g.__nativeReverb.init(sampleRate);
				state.lastRoom = room;
				state.lastDamp = damp;
				state.lastWet = wet;
				state.lastDry = dry;
			}

			// Update parameters if changed
			if (state.lastRoom !== room) {
				g.__nativeReverb.setRoom(room);
				state.lastRoom = room;
			}
			if (state.lastDamp !== damp) {
				g.__nativeReverb.setDamp(damp);
				state.lastDamp = damp;
			}
			if (state.lastWet !== wet) {
				g.__nativeReverb.setWet(wet);
				state.lastWet = wet;
			}
			if (state.lastDry !== dry) {
				g.__nativeReverb.setDry(dry);
				state.lastDry = dry;
			}

			// Process through WASM
			const output = g.__nativeReverb.process(monoInput);

			// Return same output for all input channels
			const outSig: number[] = [];
			for (let i = 0; i < inputSig.length; i++) {
				outSig.push(output);
			}
			return { out: outSig };
		}

		// =====================================================================
		// JS Fallback Implementation (all inlined for serialization)
		// =====================================================================

		// Freeverb tuning constants
		const COMB_TUNING = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
		const ALLPASS_TUNING = [556, 441, 341, 225];
		const BASE_SAMPLE_RATE = 44100;

		// Initialize JS reverb state on first call
		if (!state.initialized) {
			state.initialized = true;
			const scale = sampleRate / BASE_SAMPLE_RATE;

			// Create comb filters
			state.combsL = COMB_TUNING.map((size) => ({
				buffer: new Float32Array(Math.floor(size * scale)),
				index: 0,
			}));

			// Create allpass filters
			state.allpassesL = ALLPASS_TUNING.map((size) => ({
				buffer: new Float32Array(Math.floor(size * scale)),
				index: 0,
			}));

			state.filterStores = new Array(8).fill(0);
		}

		const combsL = state.combsL as { buffer: Float32Array; index: number }[];
		const allpassesL = state.allpassesL as {
			buffer: Float32Array;
			index: number;
		}[];
		const filterStores = state.filterStores as number[];

		// Compute feedback from room size
		const feedback = room * 0.28 + 0.7;

		// Process through parallel comb filters
		let out = 0;
		for (let i = 0; i < 8; i++) {
			const comb = combsL[i];
			if (comb) {
				// Inline processComb
				const combOutput = comb.buffer[comb.index] ?? 0;
				const store = filterStores[i] ?? 0;
				const filtered = combOutput * (1 - damp) + store * damp;
				filterStores[i] = filtered;
				comb.buffer[comb.index] = monoInput + filtered * feedback;
				comb.index = (comb.index + 1) % comb.buffer.length;
				out += combOutput;
			}
		}

		// Scale down comb filter sum (8 filters summed)
		out *= 0.125;

		// Process through series allpass filters
		for (let i = 0; i < 4; i++) {
			const allpass = allpassesL[i];
			if (allpass) {
				// Inline processAllpass
				const buffered = allpass.buffer[allpass.index] ?? 0;
				const allpassOut = buffered - out;
				allpass.buffer[allpass.index] = out + buffered * 0.5;
				allpass.index = (allpass.index + 1) % allpass.buffer.length;
				out = allpassOut;
			}
		}

		// Mix wet/dry
		const output = out * wet + monoInput * dry;

		// Return same output for all input channels
		const outSig: number[] = [];
		for (let i = 0; i < inputSig.length; i++) {
			outSig.push(output);
		}

		return { out: outSig };
	},
});
