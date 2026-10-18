/**
 * The location tables the rewrite builds from the patch code (MANIFESTO
 * §10.1). Every entry is a site: a place in the code with a range, keyed by
 * its id (its index in `sites`). Graph nodes, port bindings, pattern AST
 * leaves and pattern events carry site ids, never ranges, so they stay small
 * and the tables stay the one source of truth.
 *
 * Sites are metadata only: they are not identity, and nothing that decides
 * what the patch sounds like reads them.
 */

import type { TokenKind } from "../pattern/notation/tokenize";
import type { SourceRange } from "./range";

/** A literal written straight into a call's argument list. */
export interface ArgLiteral {
	/** The literal's site: a number site, or a pattern site for a pattern string. */
	readonly site: number;
	/** Its value, so a binding is tagged only when the value really came from it. */
	readonly value: number | string;
}

/** One argument of a call: a literal, an object literal of named literals, or neither. */
export type ArgSite = ArgLiteral | { readonly props: Readonly<Record<string, ArgLiteral>> } | null;

/** A call (or tagged template) the rewrite traces. */
export interface CallSite {
	readonly kind: "call";
	readonly id: number;
	/** `lpf(800)` for `x.lpf(800)`: the method name to the closing paren. */
	readonly range: SourceRange;
	/** The called name (`lpf`, `sin`, `p`), or null for a computed callee. */
	readonly callee: string | null;
	readonly args: readonly ArgSite[];
	/** For a `p` template: its pattern site. */
	readonly pattern?: number;
}

/** A numeric literal; a negated literal (`-3`) is one site including the sign. */
export interface NumberSite {
	readonly kind: "number";
	readonly id: number;
	readonly range: SourceRange;
	readonly value: number;
}

/**
 * One literal text segment of a pattern: a `p` template quasi, or the body of
 * a pattern string. `code` is the code offset of its first character, or null
 * when the written text differs from the parsed text (escapes), so its
 * positions cannot be mapped.
 */
export interface PatternSegment {
	readonly code: number | null;
	readonly length: number;
}

/** A pattern written in the code: a `p` template or a `seq("...")` string. */
export interface PatternSite {
	readonly kind: "pattern";
	readonly id: number;
	readonly range: SourceRange;
	readonly segments: readonly PatternSegment[];
	/** Per template splice: the site of its literal (a number or pattern string), or null. */
	readonly splices: readonly (number | null)[];
}

/** One mini-notation token inside a pattern site. */
export interface TokenSite {
	readonly kind: "token";
	readonly id: number;
	readonly range: SourceRange;
	readonly pattern: number;
	readonly token: TokenKind;
	readonly text: string;
}

export type Site = CallSite | NumberSite | PatternSite | TokenSite;

export interface SourceMap {
	/** `sites[id].id === id`. */
	readonly sites: readonly Site[];
	/** Set when the code does not parse; the rewrite then leaves the code unchanged. */
	readonly syntaxError?: SourceRange;
}

export const EMPTY_SOURCE_MAP: SourceMap = { sites: [] };
