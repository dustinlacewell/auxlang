/**
 * LaneFill — what one lane's table fills remember, so that a fill of the
 * cycle after the last one costs one query (its dip peek) and no look-back:
 *
 * - the lane's events of the last cycle read, which a fill read as the dip
 *   peek and the next fill reads as its own cycle;
 * - the carry into the cycle after the last fill, stepped on from the carry
 *   and events of the last fill (carry-forward.ts).
 *
 * Any other fill (the first, a seek, a re-fill) looks back as before, and
 * lanes whose carry comes from a voices history always read it there.
 * Queries go through the node's CycleQueries. Derived data, kept in the
 * lane's scratch and never carried; a new pattern, seed or lane forgets it.
 * Every remembered value is a pure function of (pattern, seed, lane, cycle),
 * so a fill gives the same table whichever path it takes.
 */

import type { Pat } from "../ast";
import type { Ev } from "../event";
import { type Carry, carryBefore, readsHistory } from "./carry-before";
import { carryAfter } from "./carry-forward";
import type { CycleQueries } from "./cycle-queries";
import { laneOf } from "./lane-cycle";
import { type CarryTrace, type LaneCycles, lookbackCarry, lookbackDepth } from "./lookback-carry";

export class LaneFill {
	private pat: Pat | null = null;
	private seed = 0;
	private lane = 0;
	private readCycle = Number.NaN;
	private read: Ev[] = [];
	/** The cycle whose carry is `carry`, and the cycle after the last fill. */
	private carryCycle = Number.NaN;
	private carry: CarryTrace | null = null;
	readonly cycles: LaneCycles = (c) => this.laneCycle(c);

	constructor(private readonly queries: CycleQueries) {}

	/** Fill for (pat, seed, lane) from now on; another one forgets what was remembered. */
	bind(pat: Pat, seed: number, lane: number): void {
		if (pat === this.pat && seed === this.seed && lane === this.lane) return;
		this.pat = pat;
		this.seed = seed;
		this.lane = lane;
		this.readCycle = Number.NaN;
		this.carryCycle = Number.NaN;
		this.carry = null;
	}

	/** The lane's events in cycle `c`. */
	laneCycle(c: number): Ev[] {
		if (c !== this.readCycle) {
			this.read = laneOf(this.queries.events(this.pat as Pat, this.seed, c), this.lane);
			this.readCycle = c;
		}
		return this.read;
	}

	/** What the lane holds before cycle `c`. */
	carryInto(c: number): Carry {
		const pat = this.pat as Pat;
		if (readsHistory(pat)) return carryBefore(pat, this.seed, this.lane, c, this.cycles);
		if (c !== this.carryCycle || this.carry === null) {
			this.carry = lookbackCarry(pat, this.cycles, c);
			this.carryCycle = c;
		}
		return this.carry;
	}

	/** Cycle `c` was filled from `evs` with the carry into it: step the carry on to `c + 1`. */
	filled(c: number, evs: readonly Ev[]): void {
		const pat = this.pat as Pat;
		if (readsHistory(pat) || c !== this.carryCycle || this.carry === null) return;
		this.carry = carryAfter(this.carry, evs, c, lookbackDepth(pat));
		this.carryCycle = c + 1;
	}
}
