/**
 * CycleQueries — one pattern's recent cycle queries (lane-cycle.ts), shared
 * by the lanes of one node so each cycle is queried once: the lanes of a
 * voices node read one query and pick their own events from it. It keeps the
 * last CAPACITY cycles queried, enough for a look-back window and the fill
 * around it. A query is a pure function of (pattern, seed, cycle), so a
 * remembered one is the same events; a new pattern or seed forgets them.
 */

import type { Pat } from "../ast";
import type { Ev } from "../event";
import { cycleQuery } from "./lane-cycle";
import { RANDOM_LOOKBACK_CYCLES } from "./lookback-carry";

/** A look-back window, plus the cycle filled and the one after it. */
const CAPACITY = RANDOM_LOOKBACK_CYCLES + 2;

export class CycleQueries {
	private pat: Pat | null = null;
	private seed = 0;
	private readonly cycles = new Float64Array(CAPACITY).fill(Number.NaN);
	private readonly results: (readonly Ev[])[] = new Array(CAPACITY).fill([]);
	private oldest = 0;

	/** Every lane's events in `cycle`. */
	events(pat: Pat, seed: number, cycle: number): readonly Ev[] {
		if (pat !== this.pat || seed !== this.seed) this.forget(pat, seed);
		const at = this.cycles.indexOf(cycle);
		if (at >= 0) return this.results[at] as readonly Ev[];
		const evs = cycleQuery(pat, seed, cycle);
		this.cycles[this.oldest] = cycle;
		this.results[this.oldest] = evs;
		this.oldest = (this.oldest + 1) % CAPACITY;
		return evs;
	}

	/** Hold what `other` holds: it is a pure function of its pattern and seed. */
	continueFrom(other: CycleQueries): void {
		this.pat = other.pat;
		this.seed = other.seed;
		this.cycles.set(other.cycles);
		for (let i = 0; i < CAPACITY; i++) this.results[i] = other.results[i] as readonly Ev[];
		this.oldest = other.oldest;
	}

	private forget(pat: Pat, seed: number): void {
		this.pat = pat;
		this.seed = seed;
		this.cycles.fill(Number.NaN);
		this.results.fill([]);
		this.oldest = 0;
	}
}
