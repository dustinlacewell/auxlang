/**
 * Expression-based AST types for the mini-notation parser.
 *
 * Key design principles:
 * - Every syntactic construct is an Expr
 * - Modifiers wrap any Expr uniformly
 * - Only stacks create voices (one per branch, nested stacks flatten)
 * - Voice IDs assigned to branches, not notes
 */

/** Note atom - a pitch to play */
export interface NoteExpr {
	readonly type: "note";
	readonly pitch: string; // e.g. "c4", "f#3", "bb2"
	readonly srcStart?: number; // Source position start (for visualization)
	readonly srcEnd?: number; // Source position end
}

/** Rest atom - silence */
export interface RestExpr {
	readonly type: "rest";
	readonly srcStart?: number; // Source position start (for visualization)
	readonly srcEnd?: number; // Source position end
}

/** Top-level sequence - children laid out sequentially, each = 1 beat */
export interface SeqExpr {
	readonly type: "seq";
	readonly children: Expr[];
}

/** Group [...] - children subdivide allocated duration equally */
export interface GroupExpr {
	readonly type: "group";
	readonly children: Expr[];
	readonly srcStart?: number;
	readonly srcEnd?: number;
}

/** Alternation <...> - cycle through children each pattern cycle */
export interface AltExpr {
	readonly type: "alt";
	readonly children: Expr[];
	readonly srcStart?: number;
	readonly srcEnd?: number;
}

/**
 * Stack {...} - parallel voices, each child is a branch
 *
 * Key rules:
 * - Only stacks create new voices (one per branch)
 * - Nested stacks flatten: {a, {b, c}} = 3 voices
 * - Each branch independently fills the stack's duration
 * - Single notes hold for full duration; sequences subdivide within it
 */
export interface StackExpr {
	readonly type: "stack";
	readonly children: Expr[];
	readonly srcStart?: number;
	readonly srcEnd?: number;
}

/**
 * Tie - gate holds across children, pitch changes at transitions
 *
 * Key rules:
 * - Children laid out sequentially within allocated duration
 * - Gate stays high across all children
 * - Tie only valid between expressions with matching voice counts
 */
export interface TieExpr {
	readonly type: "tie";
	readonly children: Expr[];
	readonly srcStart?: number;
	readonly srcEnd?: number;
}

/** Multiply *n - repeat child n times within same duration (subdivides) */
export interface MultiplyExpr {
	readonly type: "multiply";
	readonly child: Expr;
	readonly count: number;
	readonly srcStart?: number; // Position of the * operator
	readonly srcEnd?: number; // End of the number
}

/** Replicate !n - repeat child n times sequentially (adds beats) */
export interface ReplicateExpr {
	readonly type: "replicate";
	readonly child: Expr;
	readonly count: number;
	readonly srcStart?: number;
	readonly srcEnd?: number;
}

/** Elongate @n - stretch child across n beats */
export interface ElongateExpr {
	readonly type: "elongate";
	readonly child: Expr;
	readonly count: number;
	readonly srcStart?: number;
	readonly srcEnd?: number;
}

/** Euclidean (k,n) - distribute child across k of n steps using Bjorklund algorithm */
export interface EuclideanExpr {
	readonly type: "euclidean";
	readonly child: Expr;
	readonly hits: number;
	readonly steps: number;
	readonly srcStart?: number;
	readonly srcEnd?: number;
}

/** Maybe ?p - probability of playing (default 0.5) */
export interface MaybeExpr {
	readonly type: "maybe";
	readonly child: Expr;
	readonly prob: number;
	readonly srcStart?: number;
	readonly srcEnd?: number;
}

/** Union of all expression types */
export type Expr =
	| NoteExpr
	| RestExpr
	| SeqExpr
	| GroupExpr
	| AltExpr
	| StackExpr
	| TieExpr
	| MultiplyExpr
	| ReplicateExpr
	| ElongateExpr
	| EuclideanExpr
	| MaybeExpr;

/** Shared rest singleton */
export const REST: RestExpr = { type: "rest" };
