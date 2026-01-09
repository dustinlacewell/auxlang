/**
 * Expression-based AST types for the mini-notation parser.
 *
 * Key design principles:
 * - Every syntactic construct is an Expr
 * - Modifiers wrap any Expr uniformly
 * - Only stacks create voices (one per branch, nested stacks flatten)
 * - Voice IDs assigned to branches, not notes
 */

// ============= Expression AST =============

/** Note atom - a pitch to play */
export interface NoteExpr {
	readonly type: "note";
	readonly pitch: string; // e.g. "c4", "f#3", "bb2"
}

/** Rest atom - silence */
export interface RestExpr {
	readonly type: "rest";
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
}

/** Alternation <...> - cycle through children each pattern cycle */
export interface AltExpr {
	readonly type: "alt";
	readonly children: Expr[];
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
}

/** Multiply *n - repeat child n times within same duration (subdivides) */
export interface MultiplyExpr {
	readonly type: "multiply";
	readonly child: Expr;
	readonly count: number;
}

/** Replicate !n - repeat child n times sequentially (adds beats) */
export interface ReplicateExpr {
	readonly type: "replicate";
	readonly child: Expr;
	readonly count: number;
}

/** Elongate @n - stretch child across n beats */
export interface ElongateExpr {
	readonly type: "elongate";
	readonly child: Expr;
	readonly count: number;
}

/** Euclidean (k,n) - distribute child across k of n steps using Bjorklund algorithm */
export interface EuclideanExpr {
	readonly type: "euclidean";
	readonly child: Expr;
	readonly hits: number;
	readonly steps: number;
}

/** Maybe ?p - probability of playing (default 0.5) */
export interface MaybeExpr {
	readonly type: "maybe";
	readonly child: Expr;
	readonly prob: number;
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

// ============= Voice Counting =============

/**
 * Calculate voice count for an expression.
 *
 * Only stacks create voices. Everything else = 1 voice.
 * Nested stacks flatten: voiceCount({a, {b, c}}) = 1 + 2 = 3
 * Modifiers and tie pass through to their children.
 * Sequences/groups take the max voice count across children.
 */
export function voiceCount(expr: Expr): number {
	switch (expr.type) {
		case "stack":
			return expr.children.reduce((sum, child) => sum + voiceCount(child), 0);

		// Sequences and groups: max voice count across children
		// (if one child is a 3-voice stack, the whole seq is 3 voices)
		case "seq":
		case "group":
		case "alt":
			return expr.children.reduce((max, child) => Math.max(max, voiceCount(child)), 1);

		// Modifiers pass through to child
		case "multiply":
		case "replicate":
		case "elongate":
		case "euclidean":
		case "maybe":
			return voiceCount(expr.child);

		// Tie uses first child's voice count (all must match)
		case "tie":
			return expr.children[0] ? voiceCount(expr.children[0]) : 1;

		// Atoms (note, rest) = 1 voice
		default:
			return 1;
	}
}

// ============= Runtime Output =============

/** A single voice channel with its identity */
export interface VoiceChannel {
	readonly id: number;
	readonly value: number;
}

/** Polyphonic signal - array of voice channels */
export type PolySignal = VoiceChannel[];

/**
 * Per-sample output from sequencer.
 * Each output is a PolySignal with voice IDs.
 */
export interface SeqOutput {
	/** Frequency per voice */
	readonly cv: PolySignal;
	/** Gate per voice (0 or 1) */
	readonly gate: PolySignal;
	/** Trigger per voice (1 on onset, else 0) */
	readonly trig: PolySignal;
}
