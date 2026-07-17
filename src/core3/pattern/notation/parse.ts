/**
 * Recursive-descent parser: token stream -> `Pat` (serializable AST data).
 *
 * Strategy (the desugaring table of platonic.md §3.2 is normative):
 *   sequence of steps          -> weighted fastcat  (single unit-weight step: itself)
 *   ~                          -> silence
 *   [ .. ]                     -> fastcat (one step)
 *   < .. >                     -> slowcat
 *   { .. , .. }                -> stack
 *   a*f                        -> fast(f, a)          (f may be rational 3/2)
 *   a!n                        -> n replicated steps
 *   a@w                        -> step of weight w
 *   a_b                        -> fastcat([tieNext a, tiePrev b]) as one step
 *   a?  a?.75                  -> degrade(0.5 / 1-0.75, a)
 *   a(k,s)  a(k,s,rot)         -> euclid(k,s,rot, a)
 * Modifiers chain left-to-right: c4*2? = degrade(fast(2, c4)).
 *
 * Everything is loud: unknown chars (tokenizer), dangling modifiers, unclosed
 * brackets, malformed probabilities, empty groups — all throw with a position.
 */

import type { Pat } from "../ast";
import { degrade, euclid, fast, fastcat, pure, silence, slowcat, stack, tieNext, tiePrev } from "../combinators";
import type { R } from "../rational";
import { r } from "../rational";
import { isP } from "../pat-class";
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
	private parseSequence(stop: Set<string>): Pat {
		const steps: WStep[] = [];
		while (true) {
			const t = this.peek();
			if (!t) break;
			if (stop.has(t.kind)) break;
			this.parseStep(steps);
		}
		return foldSteps(steps, this.lastPos());
	}

	/**
	 * One step: a term with postfix modifiers, possibly tie-joined to following
	 * terms, possibly `@weight`, `!count`, or a bare `_` extend. Pushes one or
	 * more WStep entries (bang duplicates; extend adds a weight-1 tie/hold).
	 */
	private parseStep(steps: WStep[]): void {
		const t = this.peek()!;

		// Bare `_`: extend previous step's weight by 1.
		if (t.kind === "extend") {
			this.next();
			const prev = steps[steps.length - 1];
			if (!prev) throw new Error(`mini-notation: '_' with no preceding step (at position ${t.pos})`);
			steps[steps.length - 1] = { pat: prev.pat, weight: radd1(prev.weight) };
			return;
		}

		let pat = this.parseModified();
		let weight = r(1);

		// Tie chain: a_b(_c)...  -> fastcat of tie-flagged pieces as ONE step.
		if (this.peek()?.kind === "tie") {
			pat = this.parseTieChain(pat);
		}

		// Postfix @weight and !count operate on the (possibly tied) step.
		while (true) {
			const p = this.peek();
			if (p?.kind === "at") {
				this.next();
				weight = this.parseFactor();
				continue;
			}
			if (p?.kind === "bang") {
				this.next();
				const n = this.parseCount(p.pos);
				for (let k = 0; k < n; k++) steps.push({ pat, weight });
				return;
			}
			break;
		}

		steps.push({ pat, weight });
	}

	/** Build a tie chain starting from an already-parsed first term. */
	private parseTieChain(first: Pat): Pat {
		const parts: Pat[] = [first];
		while (this.peek()?.kind === "tie") {
			this.next();
			parts.push(this.parseModified());
		}
		// Flag: first gets tieNext; last gets tiePrev; middles get both.
		const flagged: Pat[] = parts.map((p, idx) => {
			const isFirst = idx === 0;
			const isLast = idx === parts.length - 1;
			let out = p;
			if (!isLast) out = tieNext(out);
			if (!isFirst) out = tiePrev(out);
			return out;
		});
		return fastcat(flagged.map((p) => ({ pat: p, weight: r(1) })));
	}

	/** A term plus its `*` / `?` / `(k,s,rot)` modifiers, chained left-to-right. */
	private parseModified(): Pat {
		let pat = this.parseTerm();
		while (true) {
			const t = this.peek();
			if (t?.kind === "star") {
				this.next();
				pat = fast(this.parseFactor(), pat);
				continue;
			}
			if (t?.kind === "question") {
				this.next();
				pat = degrade(this.parseDropProb(t.pos), pat);
				continue;
			}
			if (t?.kind === "lparen") {
				pat = this.parseEuclid(pat);
				continue;
			}
			break;
		}
		return pat;
	}

	/** A primary term: atom, rest, subgroup, alternation, or stack. */
	private parseTerm(): Pat {
		const t = this.peek();
		if (!t) throw new Error(`mini-notation: expected a value (at position ${this.lastPos()})`);

		switch (t.kind) {
			case "rest":
				this.next();
				return silence();
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

	private parseBraceGroup(): Pat {
		const open = this.next(); // {
		const body = this.parseGroupBody("rbrace", open.pos, "}");
		this.expect("rbrace", open.pos, "}");
		return body.length === 1 ? body[0]! : stack(body);
	}

	/**
	 * Comma-separated sequences inside a group. Returns one Pat per comma segment
	 * (each a folded sequence). Empty segments are errors (no parses-but-silent).
	 */
	private parseGroupBody(close: string, openPos: number, closeCh: string): Pat[] {
		const opener = closeCh === "]" ? "[" : closeCh === ">" ? "<" : "{";
		const segs: Pat[] = [];
		const stop = new Set<string>([close, "comma"]);
		while (true) {
			// parseSequence throws "empty sequence" on a missing/empty segment.
			segs.push(this.parseSequence(stop));
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
				throw new Error(`mini-notation: expected denominator after '/' (at position ${this.posOf(d)})`);
			}
			this.next();
			const den = Number(d.text);
			if (den === 0 || num <= 0) throw new Error(`mini-notation: malformed rational factor (at position ${t.pos})`);
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
		if (!Number.isInteger(n) || n < 1) throw new Error(`mini-notation: '!' count must be a positive integer (at position ${t.pos})`);
		return n;
	}

	private parseIntArg(what: string, pos: number): number {
		const t = this.peek();
		if (!t || t.kind !== "atom" || !isNumber(t.text)) {
			throw new Error(`mini-notation: expected ${what} (at position ${this.posOf(t) || pos})`);
		}
		this.next();
		const n = Number(t.text);
		if (!Number.isInteger(n)) throw new Error(`mini-notation: ${what} must be an integer (at position ${t.pos})`);
		return n;
	}

	/**
	 * Drop probability from `?` / `?.75`. A probability must be *adjacent* to the
	 * `?` (no whitespace): `a?.75` attaches, but `a? 2` is `a?` then step `2`.
	 * Keep-prob p means drop-prob 1-p; bare `?` is 0.5.
	 */
	private parseDropProb(qPos: number): number {
		const t = this.peek();
		if (t?.kind === "atom" && t.pos === qPos + 1) {
			if (!isNumber(t.text)) {
				throw new Error(`mini-notation: malformed probability '${t.text}' after '?' (at position ${t.pos})`);
			}
			this.next();
			const keep = Number(t.text);
			if (!(keep >= 0 && keep <= 1)) {
				throw new Error(`mini-notation: probability must be in [0,1], got ${t.text} (at position ${t.pos})`);
			}
			return 1 - keep;
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
		if (!t || t.kind !== "comma") throw new Error(`mini-notation: expected ',' (at position ${this.posOf(t) || pos})`);
		this.next();
	}
}

// --- module-level helpers --------------------------------------------------

const radd1 = (w: R): R => r(w.n + w.d, w.d);

/** Fold weighted steps into the sequence's Pat. */
function foldSteps(steps: readonly WStep[], pos: number): Pat {
	if (steps.length === 0) throw new Error(`mini-notation: empty sequence (at position ${pos})`);
	if (steps.length === 1 && steps[0]!.weight.n === steps[0]!.weight.d) return steps[0]!.pat;
	return fastcat(steps.map((s) => ({ pat: s.pat, weight: s.weight })));
}

/** A `<...>` segment is itself a sequence; slowcat over its steps. */
function slowcatFromSequence(seq: Pat): Pat {
	if (seq.op === "fastcat") return slowcat(seq.children.map((c) => c.pat));
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
		if (value.length === 0) throw new Error(`mini-notation: empty array interpolation (at position ${pos})`);
		return fastcat(value.map((v) => ({ pat: spliceToPat(v, pos), weight: r(1) })));
	}
	if (isP(value)) return value.ast;
	if (isPat(value)) return value;
	throw new Error(`mini-notation: cannot splice value of type ${typeof value} (at position ${pos})`);
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
