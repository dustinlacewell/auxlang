/**
 * One watch's glow, from its last monitor levels (live-contract.ts LEVEL_*)
 * and its kind (classify-output.ts). Per-watch state persists across frames
 * (a flash's decay, the flash-rate cap's recent-time ring) — `createGlowState`
 * makes one, `glowOf` is its pure step.
 *
 * Flash-rate cap (LED glow card): a trig watch ticking faster than ~3 Hz would
 * read as a flicker, not individual hits, so above that rate the glow shows a
 * steady average brightness (from the hit rate) instead of flashing per hit.
 * The cap is decided from the GAP between the last two hits, not a running
 * count, so it reacts within one hit.
 */

export type OutputKind = "unipolar" | "bipolar" | "audio" | "trig";

export interface Levels {
	readonly last: number;
	readonly min: number;
	readonly max: number;
	readonly peak: number;
	readonly hits: number;
}

export interface Glow {
	/** 0..1 brightness. */
	readonly intensity: number;
	/** -1, 0 or 1: which bipolar color, 0 for a non-bipolar kind. */
	readonly sign: -1 | 0 | 1;
	/** 0..1 flash brightness on top of intensity (trig only; 0 otherwise). */
	readonly flash: number;
}

export interface GlowState {
	lastHitAt: number | null;
	prevGapMs: number | null;
	flashStartedAt: number | null;
}

const FLASH_DECAY_MS = 180;
/** Above this rate, hits read as a steady average rather than individual flashes. */
const FLASH_CAP_HZ = 3;

export function createGlowState(): GlowState {
	return { lastHitAt: null, prevGapMs: null, flashStartedAt: null };
}

export function glowOf(levels: Levels, kind: OutputKind, state: GlowState, now: number): Glow {
	if (kind === "trig") return trigGlow(levels, state, now);
	if (kind === "audio") return { intensity: clamp01(levels.peak), sign: 0, flash: 0 };
	if (kind === "bipolar") {
		const sign = levels.last > 0 ? 1 : levels.last < 0 ? -1 : 0;
		return { intensity: clamp01(Math.abs(levels.last)), sign, flash: 0 };
	}
	// unipolar: brightness from the observed [min, max] of the frame, else the raw value.
	const span = levels.max - levels.min;
	const intensity = span > 0 ? clamp01((levels.last - levels.min) / span) : clamp01(levels.last);
	return { intensity, sign: 0, flash: 0 };
}

function trigGlow(levels: Levels, state: GlowState, now: number): Glow {
	if (levels.hits > 0) registerHits(state, levels.hits, now);
	const steady = steadyAverage(state, now);
	if (steady !== null) return { intensity: steady, sign: 0, flash: steady };
	return { intensity: 0, sign: 0, flash: decayedFlash(state, now) };
}

/** Records a hit (or several, this frame) for the gap/decay math; one hit assumed centred on `now`. */
function registerHits(state: GlowState, hits: number, now: number): void {
	for (let i = 0; i < hits; i++) {
		if (state.lastHitAt !== null) state.prevGapMs = now - state.lastHitAt;
		state.lastHitAt = now;
	}
	state.flashStartedAt = now;
}

/** Above the flash-rate cap: a steady brightness from the hit rate, else null (flash as usual). */
function steadyAverage(state: GlowState, now: number): number | null {
	if (state.prevGapMs === null || state.lastHitAt === null) return null;
	const gapMs = Math.max(state.prevGapMs, now - state.lastHitAt);
	const hz = gapMs > 0 ? 1000 / gapMs : Number.POSITIVE_INFINITY;
	if (hz <= FLASH_CAP_HZ) return null;
	return clamp01(hz / (FLASH_CAP_HZ * 4));
}

function decayedFlash(state: GlowState, now: number): number {
	if (state.flashStartedAt === null) return 0;
	const age = now - state.flashStartedAt;
	if (age >= FLASH_DECAY_MS) return 0;
	return clamp01(1 - age / FLASH_DECAY_MS);
}

function clamp01(x: number): number {
	return Math.min(1, Math.max(0, x));
}
