/**
 * Recursive-descent parser: token stream -> `Pat` (serializable AST data).
 *
 * Strategy (the desugaring table of MANIFESTO §3.3 is normative):
 *   sequence of steps          -> fastcat  (single step: itself)
 *   ~                          -> rest
 *   [ .. ]                     -> fastcat (one step)
 *   [ .. , .. ]                -> stack (chord)
 *   < .. >                     -> slowcat
 *   { .. , .. }                -> polymeter, steps from the first layer
 *   a*f  a/f                   -> fast(f, a) / slow(f, a)   (f may be rational 3/2)
 *   a!n                        -> n replicated steps
 *   a@w                        -> timecat step of weight w
 *   a _                        -> a, then a tie step as wide as a (a chord ties in every lane)
 *   a_b                        -> fastcat([a, slide b]) as one step
 *   a?  a?0.7                  -> degrade(0.5, a) / degrade(0.7, a)  (rest chance)
 *   a(k,s)  a(k,s,rot)         -> euclid(k,s,rot, a)
 * Modifiers chain left-to-right: c4*2? = degrade(fast(2, c4)).
 *
 * Everything is loud: unknown chars (tokenizer), dangling modifiers, unclosed
 * brackets, malformed probabilities, empty groups — all throw with a position.
 */

import type { Pat } from "../ast";
import {
	degrade,
	euclid,
	fast,
	fastcat,
	polymeter,
	pure,
	rest,
	slide,
	slow,
	slowcat,
	stack,
	tie,
	timecat,
} from "../combinators";
import { isP } from "../pat-class";
import type { R } from "../rational";
import { r } from "../rational";
import { tactus } from "../tactus";
import { width } from "../widths";
import { atomValue, isNumber } from "./note";
import { type Token, tokenize } from "./tokenize";

interface WStep {
	readonly pat: Pat;
	readonly weight: R;
}

class Parser {
	private i = 0;
	constructor(private readonly toks: readonly Token[]) {}

	private peek(): Token | undefined {
		return this.toks[this.i];
	}
	private next(): Token {
		const t = this.toks[this.i];
		if (!t) throw new Error("mini-notation: unexpected end of input");
		this.i++;
		return t;
	}
	private posOf(t: Token | undefined): number {
		return t ? t.pos : this.lastPos();
	}
	private lastPos(): number {
		const last = this.toks[this.toks.length - 1];
		return last ? last.pos + last.text.length : 0;
	}

	/** Parse the whole token stream as one top-level sequence. */
	parseTop(): Pat {
		const pat = this.parseSequence(new Set<string>(["__eof__"]));
		if (this.i < this.toks.length) {
			const t = this.peek()!;
			throw new Error(`mini-notation: unexpected '${t.text}' (at position ${t.pos})`);
		}
		return pat;
	}

	/**
	 * A sequence: steps until a closing/stop token. Returns a weighted fastcat,
	 * or the single step directly when there is exactly one unit-weight step.
	 */
	private parseSequence(stop: Set<string>, fold: StepFold = foldSteps): Pat {
		const steps: WStep[] = [];
		while (true) {
			const t = this.peek();
			if (!t) break;
			if (stop.has(t.kind)) break;
			this.parseStep(steps);
		}
		return fold(steps, this.lastPos());
	}

	/**
	 * One step: a term with postfix modifiers, possibly slide-joined to following
	 * terms, possibly `@weight`, `!count`, or a bare `_` tie. Pushes one or
	 * more WStep entries (bang duplicates; `_` adds a tie step).
	 */
	private parseStep(steps: WStep[]): void {
		const t = this.peek()!;

		// Bare `_`: a tie step across the previous step's lanes.
		if (t.kind === "extend") {
			this.next();
			const prev = steps[steps.length - 1];
			if (!prev)
				throw new Error(`mini-notation: '_' with no preceding step (at position ${t.pos})`);
			steps.push({ pat: tie(Math.max(1, width(prev.pat))), weight: r(1) });
			return;
		}

		let pat = this.parseModified();
		let weight = r(1);
		let count = 1;

		// Slide chain: a_b(_c)...  -> fastcat of a and slides as ONE step.
		if (this.peek()?.kind === "tie") {
			pat = this.parseSlideChain(pat);
		}

		// Postfix modifiers on the (possibly tied) step compose in any order, as in
		// Strudel: `a!2@3` = `a@3!2`. `@` sets the weight, `!` the copy count.
		while (true) {
			const p = this.peek();
			if (p?.kind === "at") {
				this.next();
				weight = this.parseFactor();
				continue;
			}
			if (p?.kind === "bang") {
				this.next();
				count *= this.parseCount(p.pos);
				continue;
			}
			const modified = this.parsePatternModifier(pat);
			if (!modified) break;
			pat = modified;
		}

		for (let k = 0; k < count; k++) steps.push({ pat, weight });
	}

	/** Build a slide chain starting from an already-parsed first term: each later term slides in. */
	private parseSlideChain(first: Pat): Pat {
		const parts: Pat[] = [first];
		while (this.peek()?.kind === "tie") {
			this.next();
			parts.push(slide(this.parseModified()));
		}
		return fastcat(parts);
	}

	/** A term plus its `*` / `/` / `?` / `(k,s,rot)` modifiers, chained left-to-right. */
	private parseModified(): Pat {
		let pat = this.parseTerm();
		while (true) {
			const modified = this.parsePatternModifier(pat);
			if (!modified) return pat;
			pat = modified;
		}
	}

	/** One `*` / `/` / `?` / `(k,s,rot)` modifier applied to `pat`, or null if none follows. */
	private parsePatternModifier(pat: Pat): Pat | null {
		const t = this.peek();
		switch (t?.kind) {
			case "star":
				this.next();
				return fast(this.parseFactor(), pat);
			case "slash":
				this.next();
				return slow(this.parseFactor(), pat);
			case "question":
				this.next();
				return degrade(this.parseDropProb(t.pos), pat);
			case "lparen":
				return this.parseEuclid(pat);
			default:
				return null;
		}
	}

	/** A primary term: atom, rest, subgroup, alternation, or stack. */
	private parseTerm(): Pat {
		const t = this.peek();
		if (!t) throw new Error(`mini-notation: expected a value (at position ${this.lastPos()})`);

		switch (t.kind) {
			case "rest":
				this.next();
				return rest();
			case "atom":
				this.next();
				return pure(atomValue(t.text, t.pos));
			case "splice":
				this.next();
				return spliceToPat(t.value, t.pos);
			case "lbracket":
				return this.parseBracketGroup();
			case "langle":
				return this.parseAngleGroup();
			case "lbrace":
				return this.parseBraceGroup();
			default:
				throw new Error(`mini-notation: expected a value, got '${t.text}' (at position ${t.pos})`);
		}
	}

	private parseBracketGroup(): Pat {
		const open = this.next(); // [
		const body = this.parseGroupBody("rbracket", open.pos, "]");
		this.expect("rbracket", open.pos, "]");
		// A bracket group may itself contain commas -> stack; else fastcat sequence.
		return body.length === 1 ? body[0]! : stack(body);
	}

	private parseAngleGroup(): Pat {
		const open = this.next(); // <
		const body = this.parseGroupBody("rangle", open.pos, ">");
		this.expect("rangle", open.pos, ">");
		// <a b c> alternates per cycle. Commas inside also stack each alternative.
		const alts = body;
		if (alts.length === 1) return slowcatFromSequence(alts[0]!);
		return stack(alts.map(slowcatFromSequence));
	}

	/** `{a b c, d e}`: polymeter. Each layer keeps its written step count, even a single step. */
	private parseBraceGroup(): Pat {
		const open = this.next(); // {
		const layers = this.parseGroupBody("rbrace", open.pos, "}", foldLayer);
		this.expect("rbrace", open.pos, "}");
		return polymeter(layers);
	}

	/**
	 * Comma-separated sequences inside a group. Returns one Pat per comma segment
	 * (each folded by `fold`). Empty segments are errors (no parses-but-silent).
	 */
	private parseGroupBody(
		close: string,
		openPos: number,
		closeCh: string,
		fold: StepFold = foldSteps,
	): Pat[] {
		const opener = closeCh === "]" ? "[" : closeCh === ">" ? "<" : "{";
		const segs: Pat[] = [];
		const stop = new Set<string>([close, "comma"]);
		while (true) {
			// The fold throws "empty sequence" on a missing/empty segment.
			segs.push(this.parseSequence(stop, fold));
			const t = this.peek();
			if (t?.kind === "comma") {
				this.next();
				continue;
			}
			break;
		}
		if (this.peek()?.kind !== close) {
			throw new Error(`mini-notation: unclosed '${opener}' (at position ${openPos})`);
		}
		return segs;
	}

	private parseEuclid(child: Pat): Pat {
		const open = this.next(); // (
		const k = this.parseIntArg("euclid pulses", open.pos);
		this.expectComma(open.pos);
		const steps = this.parseIntArg("euclid steps", open.pos);
		let rot = 0;
		if (this.peek()?.kind === "comma") {
			this.next();
			rot = this.parseIntArg("euclid rotation", open.pos);
		}
		this.expect("rparen", open.pos, ")");
		if (steps <= 0 || k < 0 || k > steps) {
			throw new Error(
				`mini-notation: euclid needs 0 <= pulses <= steps and steps > 0, got (${k},${steps}) (at position ${open.pos})`,
			);
		}
		return euclid(k, steps, rot, child);
	}

	// --- numeric argument helpers ------------------------------------------

	/** A `*` / `@` factor: an integer/decimal, or a rational `3/2`. */
	private parseFactor(): R {
		const t = this.peek();
		if (!t || t.kind !== "atom" || !isNumber(t.text)) {
			throw new Error(`mini-notation: expected a numeric factor (at position ${this.posOf(t)})`);
		}
		this.next();
		const num = Number(t.text);
		if (this.peek()?.kind === "slash") {
			this.next();
			const d = this.peek();
			if (!d || d.kind !== "atom" || !isNumber(d.text)) {
				throw new Error(
					`mini-notation: expected denominator after '/' (at position ${this.posOf(d)})`,
				);
			}
			this.next();
			const den = Number(d.text);
			if (den === 0 || num <= 0)
				throw new Error(`mini-notation: malformed rational factor (at position ${t.pos})`);
			return r(num, den);
		}
		if (num <= 0) throw new Error(`mini-notation: factor must be positive (at position ${t.pos})`);
		return r(num);
	}

	private parseCount(pos: number): number {
		const t = this.peek();
		if (!t || t.kind !== "atom" || !isNumber(t.text)) {
			throw new Error(`mini-notation: expected a count after '!' (at position ${pos})`);
		}
		this.next();
		const n = Number(t.text);
		if (!Number.isInteger(n) || n < 1)
			throw new Error(`mini-notation: '!' count must be a positive integer (at position ${t.pos})`);
		return n;
	}

	private parseIntArg(what: string, pos: number): number {
		const t = this.peek();
		if (!t || t.kind !== "atom" || !isNumber(t.text)) {
			throw new Error(`mini-notation: expected ${what} (at position ${this.posOf(t) || pos})`);
		}
		this.next();
		const n = Number(t.text);
		if (!Number.isInteger(n))
			throw new Error(`mini-notation: ${what} must be an integer (at position ${t.pos})`);
		return n;
	}

	/**
	 * Drop probability from `?` / `?0.7`. A probability must be *adjacent* to the
	 * `?` (no whitespace): `a?0.7` attaches, but `a? 2` is `a?` then step `2`.
	 * The number is the drop chance, as in Strudel; bare `?` is 0.5.
	 */
	private parseDropProb(qPos: number): number {
		const t = this.peek();
		if (t?.kind === "atom" && t.pos === qPos + 1) {
			if (!isNumber(t.text)) {
				throw new Error(
					`mini-notation: malformed probability '${t.text}' after '?' (at position ${t.pos})`,
				);
			}
			this.next();
			const drop = Number(t.text);
			if (!(drop >= 0 && drop <= 1)) {
				throw new Error(
					`mini-notation: probability must be in [0,1], got ${t.text} (at position ${t.pos})`,
				);
			}
			return drop;
		}
		return 0.5;
	}

	private expect(kind: string, openPos: number, ch: string): void {
		const t = this.peek();
		if (!t || t.kind !== kind) {
			const opener = ch === "]" ? "[" : ch === ">" ? "<" : ch === "}" ? "{" : ch === ")" ? "(" : ch;
			throw new Error(`mini-notation: unclosed '${opener}' (at position ${openPos})`);
		}
		this.next();
	}

	private expectComma(pos: number): void {
		const t = this.peek();
		if (!t || t.kind !== "comma")
			throw new Error(`mini-notation: expected ',' (at position ${this.posOf(t) || pos})`);
		this.next();
	}
}

// --- module-level helpers --------------------------------------------------

type StepFold = (steps: readonly WStep[], pos: number) => Pat;

const isUnit = (w: R): boolean => w.n === w.d;

/** Fold weighted steps into the sequence's Pat: a single unit step is itself. */
function foldSteps(steps: readonly WStep[], pos: number): Pat {
	const [only] = steps;
	if (steps.length === 1 && only && isUnit(only.weight)) return only.pat;
	return foldLayer(steps, pos);
}

/**
 * Fold steps into fastcat, or timecat when any step is weighted. Never unwraps a
 * single step, so the Pat's tactus is the written step count.
 */
function foldLayer(steps: readonly WStep[], pos: number): Pat {
	if (steps.length === 0) throw new Error(`mini-notation: empty sequence (at position ${pos})`);
	if (steps.every((s) => isUnit(s.weight))) return fastcat(steps.map((s) => s.pat));
	return timecat(steps.map((s) => [s.weight, s.pat] as const));
}

/**
 * A `<...>` segment is itself a sequence; one step per cycle. A weight there
 * counts cycles, as in Strudel: `<a@2 b>` is `timecat([2, a], [1, b]).slow(3)`,
 * so a holds for 2 cycles, then b for 1.
 */
function slowcatFromSequence(seq: Pat): Pat {
	if (seq.op === "fastcat") return slowcat(seq.children);
	if (seq.op === "timecat") return slow(tactus(seq), seq);
	return slowcat([seq]);
}

/** Convert an interpolated JS value into a Pat. */
function spliceToPat(value: unknown, pos: number): Pat {
	if (typeof value === "number") return pure(value);
	if (typeof value === "string") {
		// A note/number string, or a full mini-notation fragment.
		return parseNotation([value], []);
	}
	if (Array.isArray(value)) {
		if (value.length === 0)
			throw new Error(`mini-notation: empty array interpolation (at position ${pos})`);
		return fastcat(value.map((v) => spliceToPat(v, pos)));
	}
	if (isP(value)) return value.ast;
	if (isPat(value)) return value;
	throw new Error(
		`mini-notation: cannot splice value of type ${typeof value} (at position ${pos})`,
	);
}

/** Structural guard for raw Pat data. */
function isPat(x: unknown): x is Pat {
	return typeof x === "object" && x !== null && typeof (x as { op?: unknown }).op === "string";
}

/** Parse a template (segments + interpolations) to a Pat. */
export function parseNotation(strings: readonly string[], values: readonly unknown[]): Pat {
	const toks = tokenize(strings, values);
	if (toks.length === 0) throw new Error("mini-notation: empty pattern (at position 0)");
	return new Parser(toks).parseTop();
}

/** Parse a plain string to a Pat. */
export const parse = (src: string): Pat => parseNotation([src], []);
