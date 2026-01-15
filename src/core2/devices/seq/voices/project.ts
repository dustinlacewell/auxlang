/**
 * Voice projection - extract a single voice from polyphonic patterns.
 */

import type { Expr } from "../ast/types";
import { REST } from "../ast/types";
import type { ProjectionStrategy } from "./types";
import { countStackLeaves, voiceCountDuplicate } from "./count";

/**
 * Copy srcStart/srcEnd from source expression if present.
 */
function withSrcPos<T extends object>(target: T, source: Expr): T {
	const src = source as { srcStart?: number; srcEnd?: number };
	if (src.srcStart !== undefined && src.srcEnd !== undefined) {
		return { ...target, srcStart: src.srcStart, srcEnd: src.srcEnd };
	}
	return target;
}

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
			return withSrcPos({ type: "seq", children: expr.children.map((c) => projectVoiceDuplicate(c, voiceIndex)) }, expr);

		case "group":
			return withSrcPos({ type: "group", children: expr.children.map((c) => projectVoiceDuplicate(c, voiceIndex)) }, expr);

		case "alt":
			return withSrcPos({ type: "alt", children: expr.children.map((c) => projectVoiceDuplicate(c, voiceIndex)) }, expr);

		case "tie":
			return withSrcPos({ type: "tie", children: expr.children.map((c) => projectVoiceDuplicate(c, voiceIndex)) }, expr);

		case "multiply":
			return withSrcPos({ type: "multiply", child: projectVoiceDuplicate(expr.child, voiceIndex), count: expr.count }, expr);

		case "replicate":
			return withSrcPos({ type: "replicate", child: projectVoiceDuplicate(expr.child, voiceIndex), count: expr.count }, expr);

		case "elongate":
			return withSrcPos({ type: "elongate", child: projectVoiceDuplicate(expr.child, voiceIndex), count: expr.count }, expr);

		case "euclidean":
			return withSrcPos({ type: "euclidean", child: projectVoiceDuplicate(expr.child, voiceIndex), hits: expr.hits, steps: expr.steps }, expr);

		case "maybe":
			return withSrcPos({ type: "maybe", child: projectVoiceDuplicate(expr.child, voiceIndex), prob: expr.prob }, expr);

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
			return withSrcPos({ type: "seq", children: expr.children.map(projectBaseVoice) }, expr);

		case "group":
			return withSrcPos({ type: "group", children: expr.children.map(projectBaseVoice) }, expr);

		case "alt":
			return withSrcPos({ type: "alt", children: expr.children.map(projectBaseVoice) }, expr);

		case "tie":
			return withSrcPos({ type: "tie", children: expr.children.map(projectBaseVoice) }, expr);

		case "multiply":
			return withSrcPos({ type: "multiply", child: projectBaseVoice(expr.child), count: expr.count }, expr);

		case "replicate":
			return withSrcPos({ type: "replicate", child: projectBaseVoice(expr.child), count: expr.count }, expr);

		case "elongate":
			return withSrcPos({ type: "elongate", child: projectBaseVoice(expr.child), count: expr.count }, expr);

		case "euclidean":
			return withSrcPos({ type: "euclidean", child: projectBaseVoice(expr.child), hits: expr.hits, steps: expr.steps }, expr);

		case "maybe":
			return withSrcPos({ type: "maybe", child: projectBaseVoice(expr.child), prob: expr.prob }, expr);

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
			return withSrcPos({ type: "seq", children: expr.children.map((c) => projectStackVoice(c, targetIndex, counter)) }, expr);

		case "group":
			return withSrcPos({ type: "group", children: expr.children.map((c) => projectStackVoice(c, targetIndex, counter)) }, expr);

		case "alt":
			return withSrcPos({ type: "alt", children: expr.children.map((c) => projectStackVoice(c, targetIndex, counter)) }, expr);

		case "tie":
			return withSrcPos({ type: "tie", children: expr.children.map((c) => projectStackVoice(c, targetIndex, counter)) }, expr);

		case "multiply":
			return withSrcPos({ type: "multiply", child: projectStackVoice(expr.child, targetIndex, counter), count: expr.count }, expr);

		case "replicate":
			return withSrcPos({ type: "replicate", child: projectStackVoice(expr.child, targetIndex, counter), count: expr.count }, expr);

		case "elongate":
			return withSrcPos({ type: "elongate", child: projectStackVoice(expr.child, targetIndex, counter), count: expr.count }, expr);

		case "euclidean":
			return withSrcPos({ type: "euclidean", child: projectStackVoice(expr.child, targetIndex, counter), hits: expr.hits, steps: expr.steps }, expr);

		case "maybe":
			return withSrcPos({ type: "maybe", child: projectStackVoice(expr.child, targetIndex, counter), prob: expr.prob }, expr);

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
			return withSrcPos({ type: "seq", children: expr.children.map((c) => projectStackVoiceNested(c, targetIndex, counter)) }, expr);

		case "group":
			return withSrcPos({ type: "group", children: expr.children.map((c) => projectStackVoiceNested(c, targetIndex, counter)) }, expr);

		case "alt":
			return withSrcPos({ type: "alt", children: expr.children.map((c) => projectStackVoiceNested(c, targetIndex, counter)) }, expr);

		case "tie":
			return withSrcPos({ type: "tie", children: expr.children.map((c) => projectStackVoiceNested(c, targetIndex, counter)) }, expr);

		case "multiply":
			return withSrcPos({ type: "multiply", child: projectStackVoiceNested(expr.child, targetIndex, counter), count: expr.count }, expr);

		case "replicate":
			return withSrcPos({ type: "replicate", child: projectStackVoiceNested(expr.child, targetIndex, counter), count: expr.count }, expr);

		case "elongate":
			return withSrcPos({ type: "elongate", child: projectStackVoiceNested(expr.child, targetIndex, counter), count: expr.count }, expr);

		case "euclidean":
			return withSrcPos({ type: "euclidean", child: projectStackVoiceNested(expr.child, targetIndex, counter), hits: expr.hits, steps: expr.steps }, expr);

		case "maybe":
			return withSrcPos({ type: "maybe", child: projectStackVoiceNested(expr.child, targetIndex, counter), prob: expr.prob }, expr);

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
			// Sequences inside stacks become alternations
			return withSrcPos({ type: "alt", children: expr.children.map((c) => projectStackVoiceContent(c, targetIndex, counter)) }, expr);

		case "group":
			return withSrcPos({ type: "group", children: expr.children.map((c) => projectStackVoiceContent(c, targetIndex, counter)) }, expr);

		case "alt":
			return withSrcPos({ type: "alt", children: expr.children.map((c) => projectStackVoiceContent(c, targetIndex, counter)) }, expr);

		case "tie":
			return withSrcPos({ type: "tie", children: expr.children.map((c) => projectStackVoiceContent(c, targetIndex, counter)) }, expr);

		case "multiply":
			return withSrcPos({ type: "multiply", child: projectStackVoiceContent(expr.child, targetIndex, counter), count: expr.count }, expr);

		case "replicate":
			return withSrcPos({ type: "replicate", child: projectStackVoiceContent(expr.child, targetIndex, counter), count: expr.count }, expr);

		case "elongate":
			return withSrcPos({ type: "elongate", child: projectStackVoiceContent(expr.child, targetIndex, counter), count: expr.count }, expr);

		case "euclidean":
			return withSrcPos({ type: "euclidean", child: projectStackVoiceContent(expr.child, targetIndex, counter), hits: expr.hits, steps: expr.steps }, expr);

		case "maybe":
			return withSrcPos({ type: "maybe", child: projectStackVoiceContent(expr.child, targetIndex, counter), prob: expr.prob }, expr);

		case "note":
		case "rest":
			// Inside our target stack - keep the atom
			return expr;
	}
}
