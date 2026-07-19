/**
 * ChordP — the fluent chord species. It is NOT a Pat: chord identity lives here
 * at build time and collapses to numeric tone tables at the two compile exits,
 * `.voicing()` (a stack per slot) and `.n(indexPattern)` (the chordidx op). So a
 * chord never crosses a serialization boundary; only plain-number Pats do.
 */

import { chordidx, pure, slowcat, stack } from "../combinators";
import { LETTER_SEMITONE } from "../notation/note";
import { parseNotation } from "../notation/parse";
import { P, toP } from "../pat-class";
import { type ChordCfg, DEFAULT_CFG, toneTables } from "./compile";
import { type ChordSpec, type ChordSym, parseChordSpec } from "./parse";

export class ChordP {
	constructor(
		private readonly spec: ChordSpec,
		private readonly cfg: ChordCfg = DEFAULT_CFG,
	) {}

	/** Select the voicing dictionary. One built-in; name is accepted, not varied. */
	dict(_name = "default"): ChordP {
		return this;
	}

	/** Shift the realized voicing by n octaves (offset(-1) drops an octave). */
	offset(octaves: number): ChordP {
		return new ChordP(this.spec, { ...this.cfg, offsetOct: this.cfg.offsetOct + octaves });
	}

	/** Set the register: `mode("root:g2")` places tone 0 (the root) in g2's octave. */
	mode(spec: string): ChordP {
		const m = /^root:([a-gA-G])[#b]*(-?\d+)$/.exec(spec.trim());
		if (!m) throw new Error(`chord.mode: only 'root:<note>' is supported, got '${spec}'`);
		return new ChordP(this.spec, { ...this.cfg, rootOctave: Number(m[2]) });
	}

	/** Invert each slot so its top tone sits at or below `note` (e.g. "D5"). */
	anchor(note: string): ChordP {
		return new ChordP(this.spec, { ...this.cfg, anchor: midiOf(note) });
	}

	/** Compile to a note pattern: one stack of tones per slot, alternating. */
	voicing(): P {
		const tables = toneTables(this.spec.slots, this.cfg);
		const held = tables.flatMap((tones) =>
			Array.from({ length: this.spec.per }, () => stack(tones.map(pure))),
		);
		return new P(slowcat(held));
	}

	/** Index the current chord's tones by an integer pattern (0 = lowest tone). */
	n(index: P | string): P {
		const tables = toneTables(this.spec.slots, this.cfg);
		const child = typeof index === "string" ? parseNotation([index], []) : toP(index).ast;
		return new P(chordidx(tables, this.spec.per, child));
	}
}

/** Entry point: `chord("<Bbm9 Fm9>/4")` or `chord(["Bbm9","Fm9"])`. */
export function chord(spec: string | readonly string[]): ChordP {
	return new ChordP(parseChordSpec(spec));
}

/** MIDI note of a note name with octave (`D5` = 74). */
function midiOf(note: string): number {
	const m = /^([a-gA-G])([#b]*)(-?\d+)$/.exec(note.trim());
	if (!m) throw new Error(`chord.anchor: invalid note '${note}'`);
	let pc = LETTER_SEMITONE[m[1]!.toLowerCase()]!;
	for (const acc of m[2]!) pc += acc === "#" ? 1 : -1;
	return 12 + Number(m[3]) * 12 + pc;
}

export type { ChordSym };
