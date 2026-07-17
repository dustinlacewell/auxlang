import { defineModule } from "../module/define";
import { gatePort, phasePort, sig, trigPort } from "../types";

/**
 * Clock: integrates a beat phase ramp at `bpm`, plus a 50%-duty gate and a
 * single-sample trig at each beat boundary. Tempo is an input (modulatable).
 */
export const clock = defineModule({
	name: "clock",
	ins: { bpm: sig(120) },
	outs: { phase: phasePort(), gate: gatePort(), trig: trigPort() },
	defaultIn: "bpm",
	defaultOut: "phase",
	positional: ["bpm"],
	state: () => ({ phase: 0, lastBeat: -1 }),
	tick: (s, i, o, _cfg, sr) => {
		const phase = (s.phase as number) + i.bpm / 60 / sr;
		const beat = Math.floor(phase);
		o.phase = phase;
		o.gate = phase - beat < 0.5 ? 1 : 0;
		o.trig = beat !== (s.lastBeat as number) ? 1 : 0;
		s.phase = phase;
		s.lastBeat = beat;
	},
});
