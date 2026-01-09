import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

// PolySignal format: {id: number, value: number}[]
type PolySignal = Array<{ id: number; value: number }>;

/**
 * Freeverb-style algorithmic reverb.
 * Sums input to mono, processes, broadcasts to all input voice IDs.
 */
export const reverb = device({
	inputs: inputs({ input: 0, room: 0.5, damp: 0.5, wet: 0.33, dry: 0.7 }),
	outputs: ["out"],
	defaultInput: "input",
	defaultOutput: "out",
	wasmUrl: "/reverb.wasm",
	process(inp, _cfg, state, sampleRate) {
		const inputSig = (inp.input ?? []) as PolySignal;
		const roomSig = (inp.room ?? []) as PolySignal;
		const dampSig = (inp.damp ?? []) as PolySignal;
		const wetSig = (inp.wet ?? []) as PolySignal;
		const drySig = (inp.dry ?? []) as PolySignal;

		const room = roomSig.length > 0 ? roomSig[0]!.value : 0.5;
		const damp = dampSig.length > 0 ? dampSig[0]!.value : 0.5;
		const wet = wetSig.length > 0 ? wetSig[0]!.value : 0.33;
		const dry = drySig.length > 0 ? drySig[0]!.value : 0.7;

		if (inputSig.length === 0) return { out: [] };

		// Sum input channels to mono
		let monoInput = 0;
		for (const ch of inputSig) {
			monoInput += ch.value;
		}
		monoInput /= inputSig.length;

		// Try to use WASM reverb if available
		// biome-ignore lint/suspicious/noExplicitAny: globalThis typing in worklet
		const g = globalThis as any;
		if (g.__nativeReverb) {
			if (!state.wasmInitialized) {
				state.wasmInitialized = true;
				g.__nativeReverb.init(sampleRate);
				state.lastRoom = room;
				state.lastDamp = damp;
				state.lastWet = wet;
				state.lastDry = dry;
			}

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

			const output = g.__nativeReverb.process(monoInput);

			// Broadcast to all input voice IDs
			const outSig: PolySignal = inputSig.map((ch) => ({ id: ch.id, value: output }));
			return { out: outSig };
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
				comb.buffer[comb.index] = monoInput + filtered * feedback;
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

		const output = out * wet + monoInput * dry;

		// Broadcast to all input voice IDs
		const outSig: PolySignal = inputSig.map((ch) => ({ id: ch.id, value: output }));
		return { out: outSig };
	},
});
