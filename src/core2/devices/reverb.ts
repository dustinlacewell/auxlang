import { device } from "../device/device";
import { inputs } from "../device/inputs";

/**
 * Freeverb-style algorithmic reverb.
 * mix: 0 = dry, 1 = wet (crossfade, no clipping)
 */
export const reverb = device("reverb", {
	inputs: inputs({ input: 0, room: 0.5, damp: 0.5, mix: 0.33 }),
	outputs: ["audio"],
	defaultInput: "input",
	defaultOutput: "audio",
	wasmUrl: "/reverb.wasm",
	process(inp, _cfg, state, sampleRate) {
		const input = (inp.input as number) ?? 0;
		const room = (inp.room as number) ?? 0.5;
		const damp = (inp.damp as number) ?? 0.5;
		const mix = (inp.mix as number) ?? 0.33;

		// Try to use WASM reverb if available
		// biome-ignore lint/suspicious/noExplicitAny: globalThis typing in worklet
		const g = globalThis as any;
		if (g.__nativeReverb) {
			if (!state.wasmInitialized) {
				state.wasmInitialized = true;
				g.__nativeReverb.init(sampleRate);
				state.lastRoom = room;
				state.lastDamp = damp;
				state.lastMix = mix;
			}

			if (state.lastRoom !== room) {
				g.__nativeReverb.setRoom(room);
				state.lastRoom = room;
			}
			if (state.lastDamp !== damp) {
				g.__nativeReverb.setDamp(damp);
				state.lastDamp = damp;
			}
			if (state.lastMix !== mix) {
				g.__nativeReverb.setMix(mix);
				state.lastMix = mix;
			}

			return { audio: g.__nativeReverb.process(input) };
		}

		// JS Fallback Implementation
		const COMB_TUNING = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
		const ALLPASS_TUNING = [556, 441, 341, 225];
		const BASE_SAMPLE_RATE = 44100;

		if (!state.initialized) {
			state.initialized = true;
			const scale = sampleRate / BASE_SAMPLE_RATE;

			state.combsL = COMB_TUNING.map((size) => ({
				buffer: new Float32Array(Math.floor(size * scale)),
				index: 0,
			}));

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

		const feedback = room * 0.28 + 0.7;

		let out = 0;
		for (let i = 0; i < 8; i++) {
			const comb = combsL[i];
			if (comb) {
				const combOutput = comb.buffer[comb.index] ?? 0;
				const store = filterStores[i] ?? 0;
				const filtered = combOutput * (1 - damp) + store * damp;
				filterStores[i] = filtered;
				comb.buffer[comb.index] = input + filtered * feedback;
				comb.index = (comb.index + 1) % comb.buffer.length;
				out += combOutput;
			}
		}

		out *= 0.125;

		for (let i = 0; i < 4; i++) {
			const allpass = allpassesL[i];
			if (allpass) {
				const buffered = allpass.buffer[allpass.index] ?? 0;
				const allpassOut = buffered - out;
				allpass.buffer[allpass.index] = out + buffered * 0.5;
				allpass.index = (allpass.index + 1) % allpass.buffer.length;
				out = allpassOut;
			}
		}

		return { audio: out * mix + input * (1 - mix) };
	},
});
