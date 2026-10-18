/**
 * Realize abstract chord slots into absolute MIDI-note tone tables. This is the
 * build-time collapse: everything (register, anchor inversion, octave offset)
 * resolves to plain numbers here, so what reaches the AST is serializable data.
 */

import { intervalsFor } from "./dictionary";
import type { ChordSym } from "./parse";

/** Voicing configuration accumulated by ChordP's fluent setters. */
export interface ChordCfg {
	/** Octave the root sits in when no anchor applies (MIDI octave, c4=middle). */
	readonly rootOctave: number;
	/** Octave shift applied last (offset(-1) = -1). */
	readonly offsetOct: number;
	/** If set, invert so the top tone sits at/below this MIDI note. */
	readonly anchor: number | null;
}

export const DEFAULT_CFG: ChordCfg = { rootOctave: 4, offsetOct: 0, anchor: null };

/** MIDI note of a pitch-class in a given octave (c4 = 60). */
const noteIn = (pc: number, octave: number): number => 12 + octave * 12 + pc;

/** Absolute ascending tones for one chord slot under the config. */
export function tonesFor(sym: ChordSym, cfg: ChordCfg): number[] {
	const base = noteIn(sym.root, cfg.rootOctave);
	const raw = intervalsFor(sym.quality).map((iv) => base + iv);
	const anchored = cfg.anchor !== null ? anchorTones(raw, cfg.anchor) : raw;
	return anchored.map((n) => n + 12 * cfg.offsetOct);
}

/** Shift the whole voicing by octaves so its top tone sits at/below `anchor`. */
function anchorTones(tones: readonly number[], anchor: number): number[] {
	const top = tones[tones.length - 1] as number;
	const shift = Math.floor((anchor - top) / 12);
	return tones.map((n) => n + 12 * shift);
}

/** One tone table per slot — the payload for the chordidx AST op / voicing. */
export function toneTables(slots: readonly ChordSym[], cfg: ChordCfg): number[][] {
	return slots.map((sym) => tonesFor(sym, cfg));
}
