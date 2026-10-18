/**
 * Envelope family (ad/ar/adsr) — gate-driven linear segment machines.
 *
 * Each segment advances by a FIXED per-sample step so it completes in bounded
 * time. The step spans the segment's full nominal distance over its time:
 *   attack  : (1 - attackStart) / (attack·sr)   — attackStart captured on trigger
 *   decay   : (1 - sustain)     / (decay·sr)
 *   release : relStart          / (release·sr)   — relStart captured on gate drop
 *
 * Capturing the start level (not recomputing the step from the LIVE level each
 * sample) is what makes segments reach their target instead of approaching it
 * asymptotically (Zeno). Release from a current level of 0 (sustain=0, or gate
 * dropped mid-attack) therefore reaches 0 in bounded time and never stalls.
 *
 * Stages (state is plain serializable data):
 *   0 idle · 1 attack · 2 decay · 3 sustain/hold · 4 release
 */

/** Per-sample step to traverse `dist` over `secs` seconds (clamped positive). */
function step(dist, secs, sr) {
	return Math.abs(dist) / Math.max(1, Math.max(1e-4, secs) * sr);
}

/** AD: rising-edge triggered attack→decay→0, ignores gate duration. */
defmod(
	"ad",
	{ cat: "envelopes", doc: "Attack-decay envelope, fired by each trigger.", args: ["attack", "decay"] },
	({ sr }) => {
		let level = 0
		let stage = 0
		let wasGate = 0
		return ({ gate = gatePort(), attack = secs(0.01), decay = secs(0.1) }) => {
			const IDLE = 0
			const ATTACK = 1
			const DECAY = 2
			const gateOn = gate > 0.5
			if (gateOn && wasGate <= 0.5) stage = ATTACK
			if (stage === ATTACK) {
				level += step(1, attack, sr)
				if (level >= 1) {
					level = 1
					stage = DECAY
				}
			} else if (stage === DECAY) {
				level -= step(1, decay, sr)
				if (level <= 0) {
					level = 0
					stage = IDLE
				}
			} else {
				level = 0
			}
			wasGate = gate
			return level
		}
	},
)

/** AR: attack while gate high, release from current level when it drops. */
defmod(
	"ar",
	{ cat: "envelopes", doc: "Attack-release envelope that follows the gate.", args: ["attack", "release"] },
	({ sr }) => {
		let level = 0
		let stage = 0
		let wasGate = 0
		let relStart = 0
		return ({ gate = gatePort(), attack = secs(0.01), release = secs(0.1) }) => {
			const IDLE = 0
			const ATTACK = 1
			const SUSTAIN = 3
			const RELEASE = 4
			const gateOn = gate > 0.5
			const wasOn = wasGate > 0.5
			if (gateOn && !wasOn) stage = ATTACK
			if (!gateOn && wasOn) {
				stage = RELEASE
				relStart = level // capture level so release reaches 0 in `release` secs
			}
			if (stage === ATTACK) {
				level += step(1, attack, sr)
				if (level >= 1) {
					level = 1
					stage = SUSTAIN
				}
			} else if (stage === SUSTAIN) {
				level = 1
			} else if (stage === RELEASE) {
				level -= step(relStart, release, sr)
				if (level <= 0) {
					level = 0
					stage = IDLE
				}
			} else {
				level = 0
			}
			wasGate = gate
			return level
		}
	},
)

/** ADSR: full gate-driven envelope; decay and release step over fixed spans. */
defmod(
	"adsr",
	{
		cat: "envelopes",
		doc: "Attack-decay-sustain-release envelope that follows the gate.",
		args: ["attack", "decay", "sustain", "release"],
	},
	({ sr }) => {
		let level = 0
		let stage = 0
		let wasGate = 0
		let relStart = 0
		return ({ gate = gatePort(), attack = secs(0.01), decay = secs(0.1), sustain = unit(0.7), release = secs(0.3) }) => {
			const IDLE = 0
			const ATTACK = 1
			const DECAY = 2
			const SUSTAIN = 3
			const RELEASE = 4
			const sustainClamped = Math.max(0, Math.min(1, sustain))
			const gateOn = gate > 0.5
			const wasOn = wasGate > 0.5
			if (gateOn && !wasOn) stage = ATTACK
			if (!gateOn && wasOn) {
				stage = RELEASE
				relStart = level
			}
			if (stage === ATTACK) {
				level += step(1, attack, sr)
				if (level >= 1) {
					level = 1
					stage = DECAY
				}
			} else if (stage === DECAY) {
				level -= step(1 - sustainClamped, decay, sr)
				if (level <= sustainClamped) {
					level = sustainClamped
					stage = SUSTAIN
				}
			} else if (stage === SUSTAIN) {
				level = sustainClamped
			} else if (stage === RELEASE) {
				level -= step(relStart, release, sr)
				if (level <= 0) {
					level = 0
					stage = IDLE
				}
			} else {
				level = 0
			}
			wasGate = gate
			return level
		}
	},
)
