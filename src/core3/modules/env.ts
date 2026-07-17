import { defineModule } from "../module/define";
import { gatePort, sig, unit } from "../types";

/**
 * Envelope family (ad/ar/adsr) — gate-driven linear segment machines.
 *
 * The release-hang fix: EVERY falling segment computes its per-sample step from
 * the CURRENT level toward its target over the segment time, not from a fixed
 * endpoint (e.g. `sustain`). So release from a level of 0 (sustain=0, or gate
 * dropped mid-attack) reaches 0 in bounded time and never stalls.
 *
 * Stages are encoded as integers (state must be plain serializable data):
 *   0 idle · 1 attack · 2 decay · 3 sustain/hold · 4 release
 */

const IDLE = 0;
const ATTACK = 1;
const DECAY = 2;
const SUSTAIN = 3;
const RELEASE = 4;

const secsToStep = (target: number, level: number, secs: number, sr: number) =>
	Math.abs(target - level) / Math.max(1, Math.max(1e-4, secs) * sr);

/** AD: rising-edge triggered attack→decay→0, ignores gate duration. */
export const ad = defineModule({
	name: "ad",
	ins: { gate: gatePort(), attack: sig(0.01), decay: sig(0.1) },
	outs: { out: sig() },
	defaultIn: "gate",
	defaultOut: "out",
	positional: ["attack", "decay"],
	state: () => ({ level: 0, stage: IDLE, wasGate: 0 }),
	tick: (s, i, o, _cfg, sr) => {
		const gateOn = i.gate > 0.5;
		if (gateOn && (s.wasGate as number) <= 0.5) s.stage = ATTACK;
		let level = s.level as number;
		let stage = s.stage as number;
		if (stage === ATTACK) {
			level += secsToStep(1, level, i.attack, sr);
			if (level >= 1) {
				level = 1;
				stage = DECAY;
			}
		} else if (stage === DECAY) {
			level -= secsToStep(0, 1, i.decay, sr);
			if (level <= 0) {
				level = 0;
				stage = IDLE;
			}
		} else {
			level = 0;
		}
		s.level = level;
		s.stage = stage;
		s.wasGate = i.gate;
		o.out = level;
	},
});

/** AR: attack while gate high, release from current level when it drops. */
export const ar = defineModule({
	name: "ar",
	ins: { gate: gatePort(), attack: sig(0.01), release: sig(0.1) },
	outs: { out: sig() },
	defaultIn: "gate",
	defaultOut: "out",
	positional: ["attack", "release"],
	state: () => ({ level: 0, stage: IDLE, wasGate: 0 }),
	tick: (s, i, o, _cfg, sr) => {
		const gateOn = i.gate > 0.5;
		const wasOn = (s.wasGate as number) > 0.5;
		if (gateOn && !wasOn) s.stage = ATTACK;
		if (!gateOn && wasOn) s.stage = RELEASE;
		let level = s.level as number;
		let stage = s.stage as number;
		if (stage === ATTACK) {
			level += secsToStep(1, level, i.attack, sr);
			if (level >= 1) {
				level = 1;
				stage = SUSTAIN;
			}
		} else if (stage === SUSTAIN) {
			level = 1;
		} else if (stage === RELEASE) {
			level -= secsToStep(0, level, i.release, sr);
			if (level <= 0) {
				level = 0;
				stage = IDLE;
			}
		} else {
			level = 0;
		}
		s.level = level;
		s.stage = stage;
		s.wasGate = i.gate;
		o.out = level;
	},
});

/** ADSR: full gate-driven envelope; decay and release step from current level. */
export const adsr = defineModule({
	name: "adsr",
	ins: {
		gate: gatePort(),
		attack: sig(0.01),
		decay: sig(0.1),
		sustain: unit(0.7),
		release: sig(0.3),
	},
	outs: { out: sig() },
	defaultIn: "gate",
	defaultOut: "out",
	positional: ["attack", "decay", "sustain", "release"],
	state: () => ({ level: 0, stage: IDLE, wasGate: 0 }),
	tick: (s, i, o, _cfg, sr) => {
		const sustain = Math.max(0, Math.min(1, i.sustain));
		const gateOn = i.gate > 0.5;
		const wasOn = (s.wasGate as number) > 0.5;
		if (gateOn && !wasOn) s.stage = ATTACK;
		if (!gateOn && wasOn) s.stage = RELEASE;
		let level = s.level as number;
		let stage = s.stage as number;
		if (stage === ATTACK) {
			level += secsToStep(1, level, i.attack, sr);
			if (level >= 1) {
				level = 1;
				stage = DECAY;
			}
		} else if (stage === DECAY) {
			level -= secsToStep(sustain, 1, i.decay, sr);
			if (level <= sustain) {
				level = sustain;
				stage = SUSTAIN;
			}
		} else if (stage === SUSTAIN) {
			level = sustain;
		} else if (stage === RELEASE) {
			level -= secsToStep(0, level, i.release, sr);
			if (level <= 0) {
				level = 0;
				stage = IDLE;
			}
		} else {
			level = 0;
		}
		s.level = level;
		s.stage = stage;
		s.wasGate = i.gate;
		o.out = level;
	},
});
