import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

// PolySignal type for process function (runtime uses globalThis.poly)
type PS = Array<{ id: number; value: number }>;

/** Standard waveform shapes */
const shapes = {
	sin: (p: number) => Math.sin(p * Math.PI * 2),
	saw: (p: number) => p * 2 - 1,
	tri: (p: number) => 1 - 4 * Math.abs(p - 0.5),
	sqr: (p: number) => (p < 0.5 ? 1 : -1),
};

type ShapeFn = (phase: number) => number;

/** Create an oscillator device with a given default shape */
function createOsc(defaultShape: ShapeFn) {
	return device({
		inputs: inputs({ freq: 440, min: -1, max: 1, phase: 0, detune: 0 }),
		config: { shape: defaultShape, poly: 1 },
		outputs: ["out"],
		defaultInput: "freq",
		defaultOutput: "out",
		process(inp, cfg, state, sampleRate) {
			const freqsIn = (inp.freq ?? []) as PS;
			const mins = (inp.min ?? []) as PS;
			const maxs = (inp.max ?? []) as PS;
			const initPhases = (inp.phase ?? []) as PS;
			const detuneIn = (inp.detune ?? []) as PS;
			const polyCount = Math.max(1, Math.floor(cfg.poly));
			const detuneCents = detuneIn.length > 0 ? detuneIn[0]!.value : 0;

			if (freqsIn.length === 0) return { out: [] };

			if (!state.phases) state.phases = new Map<number, number>();
			const phases = state.phases as Map<number, number>;

			const out: PS = [];

			for (const freqCh of freqsIn) {
				const voiceId = freqCh.id;
				const baseFreq = freqCh.value;
				const min = poly.getValue(mins, voiceId, -1);
				const max = poly.getValue(maxs, voiceId, 1);
				const initPhase = poly.getValue(initPhases, voiceId, 0);

				if (polyCount === 1) {
					const phase = ((phases.get(voiceId) ?? initPhase) + baseFreq / sampleRate) % 1;
					phases.set(voiceId, phase);
					const raw = cfg.shape(phase);
					const normalized = (raw + 1) / 2;
					out.push({ id: voiceId, value: min + normalized * (max - min) });
				} else {
					for (let v = 0; v < polyCount; v++) {
						const subId = voiceId * 1000 + v;
						const t = polyCount === 1 ? 0 : (v / (polyCount - 1)) * 2 - 1;
						const centsOffset = t * detuneCents;
						const detuned = baseFreq * Math.pow(2, centsOffset / 1200);
						const phase = ((phases.get(subId) ?? initPhase) + detuned / sampleRate) % 1;
						phases.set(subId, phase);
						const raw = cfg.shape(phase);
						const normalized = (raw + 1) / 2;
						out.push({ id: subId, value: min + normalized * (max - min) });
					}
				}
			}

			return { out };
		},
	});
}

export const osc = createOsc(shapes.sin);
export const sin = createOsc(shapes.sin);
export const sawOsc = createOsc(shapes.saw);
export const tri = createOsc(shapes.tri);
export const sqr = createOsc(shapes.sqr);
