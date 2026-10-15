/**
 * The bridge modules (clock, seq) in the tick subset, for the WASM spike.
 * Their engine ticks are TypeScript closures (module/tick-subset/exempt.ts),
 * so the backend has no checked source for them; these mirror them operation
 * for operation (modules/clock.ts, modules/seq.ts, bridge/read-step.ts,
 * pattern/table/locate.ts). seq reads its lane's event table through
 * intrinsics (seq-intrinsics.ts); the host fills the table when the
 * position enters a new cycle, as `laneTable` does.
 */

import type { ModuleSource } from "../../types";

const CLOCK_TICK = `(s, i, o, cfg, sr) => {
	const beatsPerBar = cfg.beatsPerBar;
	const pos = s.pos + i.bpm / 60 / sr / beatsPerBar;
	const bar = Math.floor(pos);
	const beat = Math.floor(pos * beatsPerBar);
	o.out = pos;
	o.beat = beat !== s.lastBeat ? 1 : 0;
	o.bar = bar !== s.lastBar ? 1 : 0;
	s.pos = pos;
	s.lastBeat = beat;
	s.lastBar = bar;
}`;

const SEQ_TICK = `(s, i, o, cfg, sr) => {
	const pos = i.position;
	const cycle = Math.floor(pos);
	if (cycle !== __tableCycle()) __tableFill(cycle);
	const last = __tableCount() - 1;
	let row = Math.min(Math.max(s.row | 0, 0), last);
	let found = false;
	for (let step = 0; step <= 2; step++) {
		if (pos < __tableRow("begin", row)) {
			if (row === 0) {
				found = true;
				break;
			}
			row--;
		} else if (pos >= __tableRow("end", row)) {
			if (row === last) {
				found = true;
				break;
			}
			row++;
		} else {
			found = true;
			break;
		}
	}
	if (!found) {
		let lo = 0;
		let hi = last;
		while (lo < hi) {
			const mid = (lo + hi + 1) >> 1;
			if (__tableRow("begin", mid) <= pos) lo = mid;
			else hi = mid - 1;
		}
		row = lo;
	}
	const kind = __tableRow("kind", row);
	const noteId = __tableRow("noteId", row);
	const trig = trigOf(kind, noteId, __tableRow("slideFrom", row), s.noteId);
	const clocked = cfg.clocked === 1;
	const dipLeft = clocked ? 0 : dipLeftAfter(trig, s.gate, s.dipLeft, Math.round(0.001 * sr));
	const dipWindow = clocked
		? inDipWindow(pos, __tableRow("end", row), __tableRow("dipBefore", row), dipBeatsAt(s.started, pos - s.lastPos, sr))
		: 0;
	const gate = gateOf(kind, dipLeft, dipWindow);
	o.out = __tableRow("value", row);
	o.gate = gate;
	o.trig = trig;
	o.slide = kind === 3 ? 1 : 0;
	s.row = row;
	s.noteId = kind === 0 ? -1.7976931348623157e308 : noteId;
	s.gate = gate;
	s.dipLeft = dipLeft;
	s.lastPos = pos;
	s.started = 1;
}`;

const SEQ_HELPERS: Readonly<Record<string, string>> = {
	trigOf: `function trigOf(kind, noteId, slideFrom, prevNoteId) {
	if (kind === 0 || noteId === prevNoteId) return 0;
	return kind === 3 && slideFrom === prevNoteId ? 0 : 1;
}`,
	dipLeftAfter: `function dipLeftAfter(trig, gateWas, dipLeft, dipSamples) {
	if (trig === 1 && gateWas === 1) return dipSamples;
	return dipLeft > 0 ? dipLeft - 1 : 0;
}`,
	inDipWindow: `function inDipWindow(pos, end, dipBefore, dipBeats) {
	return dipBefore === 1 && pos >= end - dipBeats ? 1 : 0;
}`,
	gateOf: `function gateOf(kind, dipLeft, dipWindow) {
	return kind !== 0 && dipLeft === 0 && dipWindow === 0 ? 1 : 0;
}`,
	dipBeatsAt: `function dipBeatsAt(started, step, sampleRate) {
	return started === 1 && step > 0 ? 0.001 * sampleRate * step : 0;
}`,
};

export const BRIDGE_SOURCES: Readonly<Record<string, ModuleSource>> = {
	clock: { tick: CLOCK_TICK, helpers: {} },
	seq: { tick: SEQ_TICK, helpers: SEQ_HELPERS },
};
