/**
 * P — the fluent face of the pattern algebra. A thin immutable wrapper around
 * Pat data; every method delegates to a combinator and wraps the result.
 * `.ast` is the escape hatch to the serializable data.
 */

import type { Pat } from "./ast";
import {
	add,
	degrade,
	early,
	euclid,
	every,
	fast,
	fastcat,
	iter,
	late,
	mul,
	ply,
	pure,
	rev,
	slow,
	slowcat,
	stack,
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
