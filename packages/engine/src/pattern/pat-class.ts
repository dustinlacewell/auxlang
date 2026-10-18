/**
 * P — the fluent face of the pattern algebra. A thin immutable wrapper around
 * Pat data; every method delegates to a combinator and wraps the result.
 * `.ast` is the escape hatch to the serializable data.
 *
 * `palette`: when a template splice spliced a signal, `P` carries its
 * palette (pattern/palette) and every leaf in `.ast` is a palette INDEX, not
 * a payload. A `P` with no palette is unchanged from before — see
 * pattern/palette/to-palette.ts and merge-palettes.ts for the rules this
 * class delegates to.
 */

import type { Pat, SignalKind } from "./ast";
import {
	add,
	chunk,
	clip,
	compact,
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
	polymeter,
	pure,
	rev,
	segment,
	signal,
	slow,
	slowcat,
	sometimesBy,
	stack,
	steps,
	struct,
	swingBy,
	timecat,
	voices,
	withSeed,
} from "./combinators";
import { mergeAllPalettes } from "./palette/merge-palettes";
import { mapPalette } from "./palette/map-palette";
import type { PaletteSignal } from "./palette/palette-signal";
import { type R, r } from "./rational";
import { withRecord } from "./with-record";

export class P {
	constructor(
		readonly ast: Pat,
		readonly palette?: readonly PaletteSignal[],
	) {}

	/** Wrap a new ast, keeping this P's palette as is (time/structure-only combinators). */
	private own(ast: Pat): P {
		return new P(ast, this.palette);
	}

	fast(factor: number | R): P {
		return this.own(fast(factor, this.ast));
	}

	slow(factor: number | R): P {
		return this.own(slow(factor, this.ast));
	}

	rev(): P {
		return this.own(rev(this.ast));
	}

	early(amount: number | R): P {
		return this.own(early(amount, this.ast));
	}

	late(amount: number | R): P {
		return this.own(late(amount, this.ast));
	}

	/** `transformed` runs against the SAME palette, so the callback may only append members. */
	every(n: number, f: (p: P) => P): P {
		const transformed = f(new P(this.ast, this.palette));
		return new P(every(n, () => transformed.ast, this.ast), transformed.palette ?? this.palette);
	}

	iter(n: number): P {
		return this.own(iter(n, this.ast));
	}

	ply(n: number): P {
		return this.own(ply(n, this.ast));
	}

	/** In each of n slots per cycle, start the second half `amount / 2` of a slot late (Strudel's swingBy). */
	swingBy(amount: number | R, n: number): P {
		return this.own(swingBy(amount, n, this.ast));
	}

	/** `swingBy(1/3, n)`: a triplet shuffle on every other subdivision of n. */
	swing(n: number): P {
		return this.swingBy(r(1, 3), n);
	}

	euclid(k: number, steps: number, rot = 0): P {
		return this.own(euclid(k, steps, rot, this.ast));
	}

	degrade(prob = 0.5): P {
		return this.own(degrade(prob, this.ast));
	}

	/** Local seed: this pattern's randomness no longer follows the patch seed or its position. */
	seed(n: number): P {
		return this.own(withSeed(n, this.ast));
	}

	/** Payload map: on a palette pattern, maps the PALETTE (numbers add, signals get a new `.add` node), not the ast. */
	add(amount: number): P {
		if (this.palette === undefined) return this.own(add(amount, this.ast));
		return new P(
			this.ast,
			mapPalette(
				this.palette,
				(n) => n + amount,
				(s) => s.add(amount) as PaletteSignal,
			),
		);
	}

	/** Payload map: on a palette pattern, maps the PALETTE (numbers multiply, signals get a new `.mul` node), not the ast. */
	mul(amount: number): P {
		if (this.palette === undefined) return this.own(mul(amount, this.ast));
		return new P(
			this.ast,
			mapPalette(
				this.palette,
				(n) => n * amount,
				(s) => s.mul(amount) as PaletteSignal,
			),
		);
	}

	/** Records: each event gains one value per field, sampled from the field's pattern at the event's onset. */
	with(fields: Readonly<Record<string, number | Pat | P>>): P {
		const ps = Object.entries(fields).map(([name, x]) => [name, toP(x)] as const);
		if (this.palette !== undefined || ps.some(([, q]) => q.palette !== undefined))
			throw new Error("records of signal patterns are not built: .with() takes patterns of numbers");
		return new P(withRecord(Object.fromEntries(ps.map(([name, q]) => [name, q.ast])), this.ast));
	}

	/** Overlay a transformed copy shifted later by `amount`. */
	off(amount: number | R, f: (p: P) => P): P {
		return P.stack(this, f(this).late(amount));
	}

	/** Keep only this pattern's events falling under a true region of `bool`. */
	mask(bool: P): P {
		return this.own(mask(bool.ast, this.ast));
	}

	/** Re-trigger this pattern's value on each true step of `bool`. */
	struct(bool: P): P {
		return this.own(struct(bool.ast, this.ast));
	}

	/** Sample-and-hold into n discrete steps per cycle. */
	segment(n: number): P {
		return this.own(segment(n, this.ast));
	}

	/** Scale each event's duration (gate/note length) to `factor` of its slot. */
	clip(factor: number): P {
		return this.own(clip(factor, this.ast));
	}

	/** every(n) with a rotating 1/n slice: cycle i transforms slice i%n. */
	chunk(n: number, f: (p: P) => P): P {
		const transformed = f(new P(this.ast, this.palette));
		return new P(chunk(n, () => transformed.ast, this.ast), transformed.palette ?? this.palette);
	}

	/** Apply f to each event with probability prob (seeded). */
	someBy(prob: number, f: (p: P) => P): P {
		const transformed = f(new P(this.ast, this.palette));
		return new P(sometimesBy(prob, () => transformed.ast, this.ast), transformed.palette ?? this.palette);
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

	/** Re-time by steps: the nth event, rests and ties included, spans [n, n+1). Stacks count per layer. */
	steps(): P {
		return this.own(steps(this.ast));
	}

	/** Drop rests. */
	compact(): P {
		return this.own(compact(this.ast));
	}

	/** Assign events to `n` lanes under `policy`; `n` defaults to the structural width (`rr` requires it). */
	voices(policy = "packed", n?: number): P {
		return this.own(voices(policy, n, this.ast));
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
		return combine(pats, stack);
	}

	/** One per cycle (slowcat). */
	static cat(...pats: readonly (number | Pat | P)[]): P {
		return combine(pats, slowcat);
	}

	/** Squeezed into one cycle. */
	static fastcat(...pats: readonly (number | Pat | P)[]): P {
		return combine(pats, fastcat);
	}

	/** Squeezed into one cycle by weight: `P.timecat([2, a], [1, b])`. */
	static timecat(...pairs: readonly (readonly [number | R, number | Pat | P])[]): P {
		const ps = pairs.map(([, x]) => toP(x));
		const merged = mergeAllPalettes(ps);
		return new P(
			timecat(pairs.map(([weight], i) => [weight, merged.asts[i]!] as const)),
			merged.palette,
		);
	}

	/** Layers together, each at the first layer's steps per cycle. */
	static polymeter(...pats: readonly (number | Pat | P)[]): P {
		return combine(pats, polymeter);
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

/** A combinator (`stack`, `slowcat`, `fastcat`, `polymeter`) over children whose palettes merge left-to-right. */
function combine(pats: readonly (number | Pat | P)[], build: (children: readonly Pat[]) => Pat): P {
	const ps = pats.map((x) => toP(x));
	const merged = mergeAllPalettes(ps);
	return new P(build(merged.asts), merged.palette);
}
