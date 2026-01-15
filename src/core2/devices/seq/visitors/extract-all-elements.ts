/**
 * Extracts ALL highlightable elements from a pattern AST.
 *
 * This is used at eval time to register ALL possible decorations with CodeMirror.
 * CodeMirror then tracks their positions through document edits automatically.
 *
 * At runtime, we only send which element IDs are active - no positions needed.
 *
 * IDs are based on source position (srcStart:srcEnd) to ensure consistency
 * between registration and activation phases.
 */

import type { Expr } from "../ast/types";

export type ElementKind = "note" | "modifier" | "container";

export interface PatternElement {
	id: string;          // Stable ID based on position: "5:7" (srcStart:srcEnd)
	start: number;       // Source position start (relative to pattern string)
	end: number;         // Source position end
	kind: ElementKind;   // For styling
}

interface ExtractionContext {
	elements: PatternElement[];
	seenPositions: Set<string>; // Dedupe by "start:end"
}

const NOTE_TYPES = new Set(["note", "rest"]);
const MODIFIER_TYPES = new Set(["multiply", "replicate", "elongate", "euclidean", "maybe"]);
const CONTAINER_TYPES = new Set(["group", "alt", "stack", "tie"]);

/**
 * Extract all highlightable elements from an AST.
 * Returns elements with stable IDs based on source position.
 */
export function extractAllElements(expr: Expr): PatternElement[] {
	const context: ExtractionContext = {
		elements: [],
		seenPositions: new Set(),
	};

	visitExpr(expr, context);

	return context.elements;
}

function visitExpr(expr: Expr, context: ExtractionContext): void {
	const srcStart = (expr as { srcStart?: number }).srcStart;
	const srcEnd = (expr as { srcEnd?: number }).srcEnd;

	// Add this expression if it has source positions
	if (srcStart !== undefined && srcEnd !== undefined) {
		const key = `${srcStart}:${srcEnd}`;
		if (!context.seenPositions.has(key)) {
			context.seenPositions.add(key);

			let kind: ElementKind;
			if (NOTE_TYPES.has(expr.type)) {
				kind = "note";
			} else if (MODIFIER_TYPES.has(expr.type)) {
				kind = "modifier";
			} else if (CONTAINER_TYPES.has(expr.type)) {
				kind = "container";
			} else {
				// Unknown type, skip
				kind = "note"; // fallback, but won't reach here for known types
			}

			// Use position as ID for stable matching between registration and activation
			context.elements.push({
				id: key,
				start: srcStart,
				end: srcEnd,
				kind,
			});
		}
	}

	// Recurse into children
	switch (expr.type) {
		case "seq":
		case "group":
		case "alt":
		case "stack":
		case "tie":
			for (const child of expr.children) {
				visitExpr(child, context);
			}
			break;

		case "multiply":
		case "replicate":
		case "elongate":
		case "euclidean":
		case "maybe":
			visitExpr(expr.child, context);
			break;

		case "note":
		case "rest":
			// Leaf nodes, no children
			break;
	}
}
