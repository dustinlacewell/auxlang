/**
 * Expression-based parser for mini-notation.
 *
 * Outputs an Expr AST that preserves full structure for later evaluation.
 * This replaces the eager Beat/Step evaluation with lazy AST construction.
 *
 * Grammar (roughly):
 *   pattern  = seqExpr EOF
 *   seqExpr  = element+
 *   element  = tieExpr | term
 *   tieExpr  = term ('_' term)+
 *   term     = atom modifier*
 *   atom     = note | rest | group | alt | stack
 *   group    = '[' seqExpr ']'
 *   alt      = '<' seqExpr '>'
 *   stack    = '{' seqExpr (',' seqExpr)* '}'
 *   modifier = '*' number | '!' number | '@' number | '(' number ',' number ')' | '?' number?
 */

import { tokenize } from "../tokenize";
import type { Token, TokenType } from "../types";
import type {
	AltExpr,
	ElongateExpr,
	EuclideanExpr,
	Expr,
	GroupExpr,
	MaybeExpr,
	MultiplyExpr,
	NoteExpr,
	ReplicateExpr,
	RestExpr,
	SeqExpr,
	StackExpr,
	TieExpr,
} from "./types";

/** Parser state - wraps token stream with position tracking */
interface ParserState {
	tokens: Token[];
	pos: number;
}

/** Peek at current token without consuming */
function peek(state: ParserState): Token {
	return state.tokens[state.pos] ?? { type: "EOF", value: "", position: -1 };
}

/** Check if current token matches type */
function check(state: ParserState, type: TokenType): boolean {
	return peek(state).type === type;
}

/** Consume current token if it matches, return it */
function match(state: ParserState, type: TokenType): Token | null {
	if (check(state, type)) {
		const token = peek(state);
		state.pos++;
		return token;
	}
	return null;
}

/** Consume current token, error if wrong type */
function expect(state: ParserState, type: TokenType): Token {
	const token = match(state, type);
	if (!token) {
		const actual = peek(state);
		throw new Error(`Expected ${type} but got ${actual.type} at position ${actual.position}`);
	}
	return token;
}

/**
 * Parse a mini-notation string into an Expr AST.
 */
export function parseExpr(input: string): Expr {
	const tokens = tokenize(input);
	const state: ParserState = { tokens, pos: 0 };

	const result = parseSeqExpr(state);
	expect(state, "EOF");

	// Unwrap single-child seq
	if (result.type === "seq" && result.children.length === 1) {
		return result.children[0]!;
	}

	return result;
}

/** Parse a sequence of elements (top-level or within containers) */
function parseSeqExpr(state: ParserState): SeqExpr {
	const children: Expr[] = [];

	while (!isSeqTerminator(state)) {
		children.push(parseElement(state));
	}

	return { type: "seq", children };
}

/** Check if we've hit a token that ends a sequence */
function isSeqTerminator(state: ParserState): boolean {
	const type = peek(state).type;
	return (
		type === "EOF" ||
		type === "RBRACKET" ||
		type === "RANGLE" ||
		type === "RBRACE" ||
		type === "COMMA"
	);
}

/** Parse an element - either a tie chain or a single term */
function parseElement(state: ParserState): Expr {
	const first = parseTerm(state);

	// Check for tie chain: a_b_c
	if (check(state, "GLIDE")) {
		const children: Expr[] = [first];
		while (match(state, "GLIDE")) {
			children.push(parseTerm(state));
		}
		return { type: "tie", children } satisfies TieExpr;
	}

	return first;
}

/** Parse a term - atom followed by zero or more modifiers */
function parseTerm(state: ParserState): Expr {
	let expr = parseAtom(state);

	// Apply modifiers left-to-right
	while (true) {
		const modifier = parseModifier(state, expr);
		if (!modifier) break;
		expr = modifier;
	}

	return expr;
}

/** Parse an atom - note, rest, group, alt, or stack */
function parseAtom(state: ParserState): Expr {
	// Note
	const noteToken = match(state, "NOTE");
	if (noteToken) {
		return { 
			type: "note", 
			pitch: noteToken.value.toLowerCase(),
			srcStart: noteToken.position,
			srcEnd: noteToken.position + noteToken.value.length,
		} satisfies NoteExpr;
	}

	// Rest
	const restToken = match(state, "REST");
	if (restToken) {
		return { 
			type: "rest",
			srcStart: restToken.position,
			srcEnd: restToken.position + restToken.value.length,
		} satisfies RestExpr;
	}

	// Group [...]
	const lbracket = match(state, "LBRACKET");
	if (lbracket) {
		const inner = parseSeqExpr(state);
		const rbracket = expect(state, "RBRACKET");
		return { 
			type: "group", 
			children: inner.children,
			srcStart: lbracket.position,
			srcEnd: rbracket.position + 1,
		} satisfies GroupExpr;
	}

	// Alternation <...>
	const langle = match(state, "LANGLE");
	if (langle) {
		const inner = parseSeqExpr(state);
		const rangle = expect(state, "RANGLE");
		return { 
			type: "alt", 
			children: inner.children,
			srcStart: langle.position,
			srcEnd: rangle.position + 1,
		} satisfies AltExpr;
	}

	// Stack {...}
	if (match(state, "LBRACE")) {
		const branches: Expr[] = [];

		// First branch
		const firstBranch = parseSeqExpr(state);
		branches.push(wrapSeq(firstBranch));

		// Additional branches separated by comma
		while (match(state, "COMMA")) {
			const branch = parseSeqExpr(state);
			branches.push(wrapSeq(branch));
		}

		expect(state, "RBRACE");
		return { type: "stack", children: branches } satisfies StackExpr;
	}

	// Error: unexpected token
	const token = peek(state);
	throw new Error(`Unexpected token ${token.type} '${token.value}' at position ${token.position}`);
}

/** Wrap a SeqExpr's children - unwrap if single child */
function wrapSeq(seq: SeqExpr): Expr {
	if (seq.children.length === 1) {
		return seq.children[0]!;
	}
	return seq;
}

/** Try to parse a modifier, return modified expr or null */
function parseModifier(state: ParserState, child: Expr): Expr | null {
	// Multiply *n or *<alt>
	const multToken = match(state, "MULTIPLY");
	if (multToken) {
		// Check for alternating multiply: *<1 2>
		if (check(state, "LANGLE")) {
			const altExpr = parseAtom(state) as AltExpr;
			// Create multiply with alt count - evaluator handles this
			return {
				type: "multiply",
				child,
				// Store -1 to signal "use alt", actual counts in child
				count: -1,
				srcStart: multToken.position,
				srcEnd: altExpr.srcEnd ?? multToken.position + 1,
				// Attach the alt as a nested structure
			} satisfies MultiplyExpr;
			// Actually, let's handle this differently - wrap the count in an expression
			// For now, just parse as regular multiply with first number
		}
		const num = expect(state, "NUMBER");
		return {
			type: "multiply",
			child,
			count: Number.parseInt(num.value, 10),
			srcStart: num.position,
			srcEnd: num.position + num.value.length,
		} satisfies MultiplyExpr;
	}

	// Replicate !n
	const repToken = match(state, "REPLICATE");
	if (repToken) {
		const num = expect(state, "NUMBER");
		return {
			type: "replicate",
			child,
			count: Number.parseInt(num.value, 10),
			srcStart: num.position,
			srcEnd: num.position + num.value.length,
		} satisfies ReplicateExpr;
	}

	// Elongate @n
	const elongToken = match(state, "ELONGATE");
	if (elongToken) {
		const num = expect(state, "NUMBER");
		return {
			type: "elongate",
			child,
			count: Number.parseInt(num.value, 10),
			srcStart: num.position,
			srcEnd: num.position + num.value.length,
		} satisfies ElongateExpr;
	}

	// Euclidean (k,n)
	const lparen = match(state, "LPAREN");
	if (lparen) {
		const hits = expect(state, "NUMBER");
		expect(state, "COMMA");
		const steps = expect(state, "NUMBER");
		const rparen = expect(state, "RPAREN");

		// Check for nested euclidean - error per design decision
		if (child.type === "euclidean") {
			throw new Error("Nested euclidean patterns are not supported");
		}

		return {
			type: "euclidean",
			child,
			hits: Number.parseInt(hits.value, 10),
			steps: Number.parseInt(steps.value, 10),
			srcStart: hits.position,
			srcEnd: steps.position + steps.value.length,
		} satisfies EuclideanExpr;
	}

	// Maybe ?p (probability already parsed into token value)
	const maybeToken = match(state, "MAYBE");
	if (maybeToken) {
		const prob = Number.parseFloat(maybeToken.value);

		// Chain probability - multiply with existing if child is already maybe
		if (child.type === "maybe") {
			return {
				type: "maybe",
				child: child.child,
				prob: child.prob * prob,
			} satisfies MaybeExpr;
		}

		return {
			type: "maybe",
			child,
			prob,
		} satisfies MaybeExpr;
	}

	return null;
}
