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

// ============= Voice Projection =============

/**
 * Project a single voice from a polyphonic pattern.
 *
 * Given an expression and a voice index, returns a new AST representing
 * only that voice's timeline. This eliminates all StackExpr nodes,
 * replacing them with the appropriate branch for this voice.
 *
 * Key rules:
 * - Stack: select the branch containing this voice index, recurse with adjusted index
 * - Containers (seq, group, alt, tie): project each child with same voice index
 * - Modifiers: project child, re-wrap with same modifier
 * - Atoms (note, rest): return unchanged
 *
 * @param expr - The expression to project
 * @param voiceIndex - Which voice to extract (0-indexed)
 * @returns A mono AST for that voice
 */
export function projectVoice(expr: Expr, voiceIndex: number): Expr {
	switch (expr.type) {
		case "stack": {
			// Find which branch contains this voice
			let offset = 0;
			for (const child of expr.children) {
				const childVoices = voiceCount(child);
				if (voiceIndex < offset + childVoices) {
					// This branch contains our voice
					return projectVoice(child, voiceIndex - offset);
				}
				offset += childVoices;
			}
			// Should never reach here if voiceIndex < voiceCount(expr)
			throw new Error(`Voice index ${voiceIndex} out of range`);
		}

		case "seq":
			return {
				type: "seq",
				children: expr.children.map((child) => projectVoice(child, voiceIndex)),
			};

		case "group":
			return {
				type: "group",
				children: expr.children.map((child) => projectVoice(child, voiceIndex)),
			};

		case "alt":
			return {
				type: "alt",
				children: expr.children.map((child) => projectVoice(child, voiceIndex)),
			};

		case "tie":
			return {
				type: "tie",
				children: expr.children.map((child) => projectVoice(child, voiceIndex)),
			};

		case "multiply":
			return { type: "multiply", child: projectVoice(expr.child, voiceIndex), count: expr.count };

		case "replicate":
			return { type: "replicate", child: projectVoice(expr.child, voiceIndex), count: expr.count };

		case "elongate":
			return { type: "elongate", child: projectVoice(expr.child, voiceIndex), count: expr.count };

		case "euclidean":
			return {
				type: "euclidean",
				child: projectVoice(expr.child, voiceIndex),
				hits: expr.hits,
				steps: expr.steps,
			};

		case "maybe":
			return { type: "maybe", child: projectVoice(expr.child, voiceIndex), prob: expr.prob };

		case "note":
		case "rest":
			return expr;
	}
}

/**
 * Decompose a polyphonic pattern into N mono patterns.
 *
 * @param expr - The expression to decompose
 * @returns Array of mono ASTs, one per voice
 */
export function decomposePattern(expr: Expr): Expr[] {
	const count = voiceCount(expr);
	return Array.from({ length: count }, (_, i) => projectVoice(expr, i));
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
