/**
 * P — the fluent face of the pattern algebra. A thin immutable wrapper around
 * Pat data; every method delegates to a combinator and wraps the result.
 * `.ast` is the escape hatch to the serializable data.
 */

import type { Pat, SignalKind } from "./ast";
import {
	add,
	chunk,
	clip,
	degrade,
	early,
	euclid,
	every,
	fast,
	fastcat,
	iter,
	late,
	mask,
	mul,
	ply,
	pure,
	rev,
	segment,
	signal,
	slow,
	slowcat,
	sometimesBy,
	stack,
	struct,
} from "./combinators";
import type { R } from "./rational";

export class P {
	constructor(readonly ast: Pat) {}

	fast(factor: number | R): P {
		return new P(fast(factor, this.ast));
	}

	slow(factor: number | R): P {
		return new P(slow(factor, this.ast));
	}

	rev(): P {
		return new P(rev(this.ast));
	}

	early(amount: number | R): P {
		return new P(early(amount, this.ast));
	}

	late(amount: number | R): P {
		return new P(late(amount, this.ast));
	}

	every(n: number, f: (p: P) => P): P {
		return new P(every(n, (child) => f(new P(child)).ast, this.ast));
	}

	iter(n: number): P {
		return new P(iter(n, this.ast));
	}

	ply(n: number): P {
		return new P(ply(n, this.ast));
	}

	euclid(k: number, steps: number, rot = 0): P {
		return new P(euclid(k, steps, rot, this.ast));
	}

	degrade(prob = 0.5): P {
		return new P(degrade(prob, this.ast));
	}

	add(amount: number): P {
		return new P(add(amount, this.ast));
	}

	mul(amount: number): P {
		return new P(mul(amount, this.ast));
	}

	/** Overlay a transformed copy shifted later by `amount`. */
	off(amount: number | R, f: (p: P) => P): P {
		return P.stack(this, f(this).late(amount));
	}

	/** Keep only this pattern's events falling under a true region of `bool`. */
	mask(bool: P): P {
		return new P(mask(bool.ast, this.ast));
	}

	/** Re-trigger this pattern's value on each true step of `bool`. */
	struct(bool: P): P {
		return new P(struct(bool.ast, this.ast));
	}

	/** Sample-and-hold into n discrete steps per cycle. */
	segment(n: number): P {
		return new P(segment(n, this.ast));
	}

	/** Scale each event's duration (gate/note length) to `factor` of its slot. */
	clip(factor: number): P {
		return new P(clip(factor, this.ast));
	}

	/** every(n) with a rotating 1/n slice: cycle i transforms slice i%n. */
	chunk(n: number, f: (p: P) => P): P {
		return new P(chunk(n, (child) => f(new P(child)).ast, this.ast));
	}

	/** Apply f to each event with probability prob (seeded). */
	someBy(prob: number, f: (p: P) => P): P {
		return new P(sometimesBy(prob, (child) => f(new P(child)).ast, this.ast));
	}

	sometimes(f: (p: P) => P): P {
		return this.someBy(0.5, f);
	}

	often(f: (p: P) => P): P {
		return this.someBy(0.75, f);
	}

	rarely(f: (p: P) => P): P {
		return this.someBy(0.25, f);
	}

	always(f: (p: P) => P): P {
		return this.someBy(1, f);
	}

	/** Map a 0..1 signal pattern into [lo, hi]. */
	range(lo: number, hi: number): P {
		return this.mul(hi - lo).add(lo);
	}

	static signal(kind: SignalKind): P {
		return new P(signal(kind));
	}

	/** Index a chord's tones by this integer pattern: `n(...).set(chords)`. */
	set(chords: { n(index: P): P }): P {
		return chords.n(this);
	}

	stack(...others: readonly (number | Pat | P)[]): P {
		return P.stack(this, ...others);
	}

	static stack(...pats: readonly (number | Pat | P)[]): P {
		return new P(stack(pats.map((x) => toP(x).ast)));
	}

	/** One per cycle (slowcat). */
	static cat(...pats: readonly (number | Pat | P)[]): P {
		return new P(slowcat(pats.map((x) => toP(x).ast)));
	}

	/** Squeezed into one cycle. */
	static fastcat(...pats: readonly (number | Pat | P)[]): P {
		return new P(fastcat(pats.map((x) => toP(x).ast)));
	}
}

export function isP(x: unknown): x is P {
	return x instanceof P;
}

export function toP(x: number | Pat | P): P {
	if (isP(x)) return x;
	if (typeof x === "number") return new P(pure(x));
	return new P(x);
}
