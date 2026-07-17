/**
 * Shared per-cycle event track for the bridge modules (seq, patsig). One
 * cycle's events are cached in module state as flat typed arrays (per-cycle
 * allocation only — never per-sample); a cursor locates the current event by
 * phase. Events must arrive sorted by part.begin.
 *
 * Track fields (spread into the module's state()):
 *   primed/cycle   requery bookkeeping
 *   evStart/evEnd  absolute beat positions (floats; exactness lives in query)
 *   evVal          event payloads
 *   evOnset        1 where the event is a true onset (isOnset — tiePrev suppresses)
 *   evHold         1 where the gate holds through the event end (tieNext, or the
 *                  whole continues past this part — e.g. into the next cycle)
 *   evCount/idx    fill level and cursor (idx = number of events started)
 */

import type { Ev } from "../pattern/event";
import { isOnset } from "../pattern/event";
import { rlt, rtof } from "../pattern/rational";

export function trackStateFields(): Record<string, unknown> {
	return {
		primed: 0,
		cycle: 0,
		evCount: 0,
		idx: 0,
		evStart: new Float64Array(0),
		evEnd: new Float64Array(0),
		evVal: new Float64Array(0),
		evOnset: new Int8Array(0),
		evHold: new Int8Array(0),
	};
}

/** Refill the track from one cycle's events (sorted by part.begin) and reset the cursor. */
export function fillTrack(s: Record<string, unknown>, evs: readonly Ev[]): void {
	const n = evs.length;
	if ((s.evStart as Float64Array).length < n) {
		s.evStart = new Float64Array(n);
		s.evEnd = new Float64Array(n);
		s.evVal = new Float64Array(n);
		s.evOnset = new Int8Array(n);
		s.evHold = new Int8Array(n);
	}
	const start = s.evStart as Float64Array;
	const end = s.evEnd as Float64Array;
	const val = s.evVal as Float64Array;
	const onset = s.evOnset as Int8Array;
	const hold = s.evHold as Int8Array;
	for (let i = 0; i < n; i++) {
		const ev = evs[i] as Ev;
		start[i] = rtof(ev.part.begin);
		end[i] = rtof(ev.part.end);
		val[i] = ev.value;
		onset[i] = isOnset(ev) ? 1 : 0;
		const continues = ev.whole !== null && rlt(ev.part.end, ev.whole.end);
		hold[i] = ev.tieNext === true || continues ? 1 : 0;
	}
	s.evCount = n;
	s.idx = 0;
}

/**
 * Advance the cursor to `phase` (beats). Returns 1 if any ONSET event was
 * entered by this advance — single-sample by construction, since the cursor
 * passes each event once. Backward scrub inside the cycle rescans from 0.
 */
export function advanceTrack(s: Record<string, unknown>, phase: number): number {
	const start = s.evStart as Float64Array;
	const onsetFlags = s.evOnset as Int8Array;
	const count = s.evCount as number;
	let idx = s.idx as number;
	if (idx > 0 && phase < (start[idx - 1] as number)) idx = 0;
	let onset = 0;
	while (idx < count && phase >= (start[idx] as number)) {
		if (onsetFlags[idx] === 1) onset = 1;
		idx++;
	}
	s.idx = idx;
	return onset;
}
