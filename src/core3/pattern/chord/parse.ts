/**
 * Chord-spec parser. Two grammars, kept deliberately small:
 *   - a chord NAME: `<Root><quality>` — root is a note letter + accidentals
 *     (no octave; the register comes from voicing), quality indexes the dict.
 *   - a chord PATTERN: `<A B C>/n` alternation with an optional `/n` hold, or a
 *     bare name (one slot, per 1). No nesting — that's what the port needs.
 */

import { LETTER_SEMITONE } from "../notation/note";

/** A parsed chord: root pitch-class (0..11) and a dictionary quality key. */
export interface ChordSym {
	readonly root: number;
	readonly quality: string;
}

/** Chord slots plus how many cycles each slot holds (`/n`, default 1). */
export interface ChordSpec {
	readonly slots: readonly ChordSym[];
	readonly per: number;
}

const NAME_RE = /^([a-gA-G])([#b]*)(.*)$/;

/** Parse one chord name (`Bbm9`) into root pitch-class + quality. */
export function parseChordName(name: string): ChordSym {
	const m = NAME_RE.exec(name.trim());
	if (!m) throw new Error(`chord: invalid chord name '${name}'`);
	const letter = m[1]!.toLowerCase();
	let root = LETTER_SEMITONE[letter]!;
	for (const acc of m[2]!) root += acc === "#" ? 1 : -1;
	return { root: ((root % 12) + 12) % 12, quality: m[3]! };
}

/** Parse a chord spec string or list into slots + per. */
export function parseChordSpec(spec: string | readonly string[]): ChordSpec {
	if (Array.isArray(spec)) {
		return { slots: spec.map(parseChordName), per: 1 };
	}
	const text = (spec as string).trim();
	const alt = /^<([^>]*)>(?:\/(\d+))?$/.exec(text);
	if (alt) {
		const names = alt[1]!.trim().split(/\s+/).filter(Boolean);
		if (names.length === 0) throw new Error(`chord: empty alternation in '${text}'`);
		return { slots: names.map(parseChordName), per: alt[2] ? Number(alt[2]) : 1 };
	}
	return { slots: [parseChordName(text)], per: 1 };
}
