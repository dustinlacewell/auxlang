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
	readonly srcStart?: number; // Source position start (for visualization)
	readonly srcEnd?: number;   // Source position end
}

/** Rest atom - silence */
export interface RestExpr {
	readonly type: "rest";
	readonly srcStart?: number; // Source position start (for visualization)
	readonly srcEnd?: number;   // Source position end
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
	readonly srcStart?: number; // Position of the * operator
	readonly srcEnd?: number;   // End of the number
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

// ============= Projection Strategy =============

/**
 * How to project polyphonic patterns into mono voices.
 *
 * "duplicate" (current behavior):
 *   Non-stack notes are duplicated into each voice lane.
 *   voiceCount({a, b}) = 2, both voices get surrounding context.
 *
 * "isolate":
 *   Voice 0 = non-stack content with rests where stacks appear.
 *   Voices 1+ = one per stack child, rests elsewhere.
 *   voiceCount([c4 {e4, g4} e4]) = 3:
 *     Voice 0: [c4 ~ e4]
 *     Voice 1: [~ e4 ~]
 *     Voice 2: [~ g4 ~]
 */
export type ProjectionStrategy = "duplicate" | "isolate";

// ============= Voice Counting =============

/**
 * Calculate voice count for an expression.
 *
 * Strategy affects counting:
 * - "duplicate": voiceCount = max stack depth (stacks sum children)
 * - "isolate": voiceCount = 1 + total stack children (base voice + stack lanes)
 */
export function voiceCount(expr: Expr, strategy: ProjectionStrategy = "duplicate"): number {
	return strategy === "duplicate" ? voiceCountDuplicate(expr) : voiceCountIsolate(expr);
}

/**
 * Duplicate strategy: stack children sum, containers take max.
 */
function voiceCountDuplicate(expr: Expr): number {
	switch (expr.type) {
		case "stack":
			return expr.children.reduce((sum, child) => sum + voiceCountDuplicate(child), 0);

		// Sequences and groups: max voice count across children
		// (if one child is a 3-voice stack, the whole seq is 3 voices)
		case "seq":
		case "group":
		case "alt":
			return expr.children.reduce((max, child) => Math.max(max, voiceCountDuplicate(child)), 1);

		// Modifiers pass through to child
		case "multiply":
		case "replicate":
		case "elongate":
		case "euclidean":
		case "maybe":
			return voiceCountDuplicate(expr.child);

		// Tie uses first child's voice count (all must match)
		case "tie":
			return expr.children[0] ? voiceCountDuplicate(expr.children[0]) : 1;

		// Atoms (note, rest) = 1 voice
		default:
			return 1;
	}
}

/**
 * Isolate strategy: 1 base voice + count of stack leaf children.
 * A "stack leaf" is a stack child that is not itself a stack.
 */
function voiceCountIsolate(expr: Expr): number {
	return 1 + countStackLeaves(expr);
}

/**
 * Count stack leaf children - stack children that are not stacks themselves.
 * Nested stacks are transparent: {a, {b, c}} has 3 leaves (a, b, c).
 */
function countStackLeaves(expr: Expr): number {
	switch (expr.type) {
		case "stack":
			return expr.children.reduce((sum, child) => {
				if (child.type === "stack") {
					// Nested stack is transparent - count its leaves
					return sum + countStackLeaves(child);
				}
				// Non-stack child = 1 leaf, plus any stacks nested inside it
				return sum + 1 + countStackLeaves(child);
			}, 0);

		case "seq":
		case "group":
		case "alt":
		case "tie":
			return expr.children.reduce((sum, child) => sum + countStackLeaves(child), 0);

		case "multiply":
		case "replicate":
		case "elongate":
		case "euclidean":
		case "maybe":
			return countStackLeaves(expr.child);

		// Atoms have no stack children
		default:
			return 0;
	}
}

// ============= Voice Projection =============

const REST: RestExpr = { type: "rest" };

/**
 * Project a single voice from a polyphonic pattern.
 *
 * @param expr - The expression to project
 * @param voiceIndex - Which voice to extract (0-indexed)
 * @param strategy - Projection strategy (default: "duplicate")
 * @returns A mono AST for that voice
 */
export function projectVoice(expr: Expr, voiceIndex: number, strategy: ProjectionStrategy = "duplicate"): Expr {
	return strategy === "duplicate"
		? projectVoiceDuplicate(expr, voiceIndex)
		: projectVoiceIsolate(expr, voiceIndex);
}

/**
 * Duplicate strategy: non-stack notes duplicated into each voice lane.
 * Stack selects branch containing this voice index.
 */
function projectVoiceDuplicate(expr: Expr, voiceIndex: number): Expr {
	switch (expr.type) {
		case "stack": {
			// Find which branch contains this voice
			let offset = 0;
			for (const child of expr.children) {
				const childVoices = voiceCountDuplicate(child);
				if (voiceIndex < offset + childVoices) {
					return projectVoiceDuplicate(child, voiceIndex - offset);
				}
				offset += childVoices;
			}
			throw new Error(`Voice index ${voiceIndex} out of range`);
		}

		case "seq":
			return { type: "seq", children: expr.children.map((c) => projectVoiceDuplicate(c, voiceIndex)) };

		case "group":
			return { type: "group", children: expr.children.map((c) => projectVoiceDuplicate(c, voiceIndex)) };

		case "alt":
			return { type: "alt", children: expr.children.map((c) => projectVoiceDuplicate(c, voiceIndex)) };

		case "tie":
			return { type: "tie", children: expr.children.map((c) => projectVoiceDuplicate(c, voiceIndex)) };

		case "multiply":
			return { type: "multiply", child: projectVoiceDuplicate(expr.child, voiceIndex), count: expr.count };

		case "replicate":
			return { type: "replicate", child: projectVoiceDuplicate(expr.child, voiceIndex), count: expr.count };

		case "elongate":
			return { type: "elongate", child: projectVoiceDuplicate(expr.child, voiceIndex), count: expr.count };

		case "euclidean":
			return { type: "euclidean", child: projectVoiceDuplicate(expr.child, voiceIndex), hits: expr.hits, steps: expr.steps };

		case "maybe":
			return { type: "maybe", child: projectVoiceDuplicate(expr.child, voiceIndex), prob: expr.prob };

		case "note":
		case "rest":
			return expr;
	}
}

/**
 * Isolate strategy: voice 0 = non-stack content, voices 1+ = individual stack children.
 *
 * Uses a two-pass approach:
 * 1. Count stack children to assign indices
 * 2. Project based on target voice index
 */
function projectVoiceIsolate(expr: Expr, voiceIndex: number): Expr {
	if (voiceIndex === 0) {
		// Base voice: keep all non-stack content, replace stacks with rests
		return projectBaseVoice(expr);
	}
	// Stack voice: find the stack child at this index, rest everywhere else
	return projectStackVoice(expr, voiceIndex, { counter: 0 });
}

/**
 * Project base voice (voice 0): keeps non-stack atoms, replaces stacks with rests.
 */
function projectBaseVoice(expr: Expr): Expr {
	switch (expr.type) {
		case "stack":
			// Replace entire stack with rest
			return REST;

		case "seq":
			return { type: "seq", children: expr.children.map(projectBaseVoice) };

		case "group":
			return { type: "group", children: expr.children.map(projectBaseVoice) };

		case "alt":
			return { type: "alt", children: expr.children.map(projectBaseVoice) };

		case "tie":
			return { type: "tie", children: expr.children.map(projectBaseVoice) };

		case "multiply":
			return { type: "multiply", child: projectBaseVoice(expr.child), count: expr.count };

		case "replicate":
			return { type: "replicate", child: projectBaseVoice(expr.child), count: expr.count };

		case "elongate":
			return { type: "elongate", child: projectBaseVoice(expr.child), count: expr.count };

		case "euclidean":
			return { type: "euclidean", child: projectBaseVoice(expr.child), hits: expr.hits, steps: expr.steps };

		case "maybe":
			return { type: "maybe", child: projectBaseVoice(expr.child), prob: expr.prob };

		case "note":
		case "rest":
			return expr;
	}
}

/**
 * Project stack voice (voices 1+): finds the Nth stack leaf, rests elsewhere.
 * Stack leaves are non-stack children of stacks. Nested stacks are transparent.
 */
function projectStackVoice(expr: Expr, targetIndex: number, counter: { counter: number }): Expr {
	switch (expr.type) {
		case "stack": {
			// Check each child - is it our target leaf?
			for (const child of expr.children) {
				if (child.type === "stack") {
					// Nested stack is transparent - recurse into it
					const result = projectStackVoice(child, targetIndex, counter);
					if (result.type !== "rest") {
						return result;
					}
				} else {
					// Non-stack child = a leaf
					counter.counter++;
					const nestedCount = countStackLeaves(child);
					if (counter.counter === targetIndex) {
						// This leaf is our target
						return projectStackVoiceContent(child, targetIndex, counter);
					}
					if (targetIndex > counter.counter && targetIndex <= counter.counter + nestedCount) {
						// Target is a nested leaf INSIDE this child - project into it
						return projectStackVoiceNested(child, targetIndex, counter);
					}
					// Skip past this leaf and its nested leaves
					counter.counter += nestedCount;
				}
			}
			// Our target wasn't in this stack - return rest
			return REST;
		}

		case "seq":
			return { type: "seq", children: expr.children.map((c) => projectStackVoice(c, targetIndex, counter)) };

		case "group":
			return { type: "group", children: expr.children.map((c) => projectStackVoice(c, targetIndex, counter)) };

		case "alt":
			return { type: "alt", children: expr.children.map((c) => projectStackVoice(c, targetIndex, counter)) };

		case "tie":
			return { type: "tie", children: expr.children.map((c) => projectStackVoice(c, targetIndex, counter)) };

		case "multiply":
			return { type: "multiply", child: projectStackVoice(expr.child, targetIndex, counter), count: expr.count };

		case "replicate":
			return { type: "replicate", child: projectStackVoice(expr.child, targetIndex, counter), count: expr.count };

		case "elongate":
			return { type: "elongate", child: projectStackVoice(expr.child, targetIndex, counter), count: expr.count };

		case "euclidean":
			return { type: "euclidean", child: projectStackVoice(expr.child, targetIndex, counter), hits: expr.hits, steps: expr.steps };

		case "maybe":
			return { type: "maybe", child: projectStackVoice(expr.child, targetIndex, counter), prob: expr.prob };

		case "note":
		case "rest":
			// Not inside our target stack - rest
			return REST;
	}
}

/**
 * Project a nested stack leaf - traverse into structure, output rest where we're NOT in the target stack.
 */
function projectStackVoiceNested(expr: Expr, targetIndex: number, counter: { counter: number }): Expr {
	switch (expr.type) {
		case "stack": {
			// Find our target within this stack
			for (const child of expr.children) {
				if (child.type === "stack") {
					const result = projectStackVoiceNested(child, targetIndex, counter);
					if (result.type !== "rest") {
						return result;
					}
				} else {
					counter.counter++;
					const nestedCount = countStackLeaves(child);
					if (counter.counter === targetIndex) {
						return projectStackVoiceContent(child, targetIndex, counter);
					}
					if (targetIndex > counter.counter && targetIndex <= counter.counter + nestedCount) {
						return projectStackVoiceNested(child, targetIndex, counter);
					}
					counter.counter += nestedCount;
				}
			}
			return REST;
		}

		case "seq":
			return { type: "seq", children: expr.children.map((c) => projectStackVoiceNested(c, targetIndex, counter)) };

		case "group":
			return { type: "group", children: expr.children.map((c) => projectStackVoiceNested(c, targetIndex, counter)) };

		case "alt":
			return { type: "alt", children: expr.children.map((c) => projectStackVoiceNested(c, targetIndex, counter)) };

		case "tie":
			return { type: "tie", children: expr.children.map((c) => projectStackVoiceNested(c, targetIndex, counter)) };

		case "multiply":
			return { type: "multiply", child: projectStackVoiceNested(expr.child, targetIndex, counter), count: expr.count };

		case "replicate":
			return { type: "replicate", child: projectStackVoiceNested(expr.child, targetIndex, counter), count: expr.count };

		case "elongate":
			return { type: "elongate", child: projectStackVoiceNested(expr.child, targetIndex, counter), count: expr.count };

		case "euclidean":
			return { type: "euclidean", child: projectStackVoiceNested(expr.child, targetIndex, counter), hits: expr.hits, steps: expr.steps };

		case "maybe":
			return { type: "maybe", child: projectStackVoiceNested(expr.child, targetIndex, counter), prob: expr.prob };

		case "note":
		case "rest":
			// We're outside any stack in this path - rest
			return REST;
	}
}

/**
 * Project content inside our target stack leaf.
 * Keeps atoms, continues searching for nested stacks.
 */
function projectStackVoiceContent(expr: Expr, targetIndex: number, counter: { counter: number }): Expr {
	switch (expr.type) {
		case "stack":
			// Nested stack inside our target - need to pick which branch
			for (const child of expr.children) {
				if (child.type === "stack") {
					const result = projectStackVoiceContent(child, targetIndex, counter);
					if (result.type !== "rest") {
						return result;
					}
				} else {
					counter.counter++;
					if (counter.counter === targetIndex) {
						return projectStackVoiceContent(child, targetIndex, counter);
					}
					counter.counter += countStackLeaves(child);
				}
			}
			return REST;

		case "seq":
			return { type: "seq", children: expr.children.map((c) => projectStackVoiceContent(c, targetIndex, counter)) };

		case "group":
			return { type: "group", children: expr.children.map((c) => projectStackVoiceContent(c, targetIndex, counter)) };

		case "alt":
			return { type: "alt", children: expr.children.map((c) => projectStackVoiceContent(c, targetIndex, counter)) };

		case "tie":
			return { type: "tie", children: expr.children.map((c) => projectStackVoiceContent(c, targetIndex, counter)) };

		case "multiply":
			return { type: "multiply", child: projectStackVoiceContent(expr.child, targetIndex, counter), count: expr.count };

		case "replicate":
			return { type: "replicate", child: projectStackVoiceContent(expr.child, targetIndex, counter), count: expr.count };

		case "elongate":
			return { type: "elongate", child: projectStackVoiceContent(expr.child, targetIndex, counter), count: expr.count };

		case "euclidean":
			return { type: "euclidean", child: projectStackVoiceContent(expr.child, targetIndex, counter), hits: expr.hits, steps: expr.steps };

		case "maybe":
			return { type: "maybe", child: projectStackVoiceContent(expr.child, targetIndex, counter), prob: expr.prob };

		case "note":
		case "rest":
			// Inside our target stack - keep the atom
			return expr;
	}
}

/**
 * Decompose a polyphonic pattern into N mono patterns.
 *
 * @param expr - The expression to decompose
 * @param strategy - Projection strategy (default: "duplicate")
 * @returns Array of mono ASTs, one per voice
 */
export function decomposePattern(expr: Expr, strategy: ProjectionStrategy = "duplicate"): Expr[] {
	const count = voiceCount(expr, strategy);
	return Array.from({ length: count }, (_, i) => projectVoice(expr, i, strategy));
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
