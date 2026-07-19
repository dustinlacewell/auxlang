/**
 * Width resolution. A node's width is the max of its input source widths
 * (constants/lambdas are 1; a lane-selected ref is 1). `policy: "reduce"`
 * collapses output width to 1. `config.__width` pins a node's width
 * explicitly (test hook; seq/patsig width rules land with the bridge track).
 *
 * Computed as a monotone fixpoint so widths propagate through z-edge cycles.
 */

import { isLambdaInput, isNodeRef, isZRef } from "../graph/input-kinds";
import type { GNode, InputValue } from "../graph/node";
import { type SpecTable, resolveSpec } from "../module/resolve";

export function resolveWidths(nodes: readonly GNode[], specs?: SpecTable): Map<GNode, number> {
	const widths = new Map<GNode, number>();
	for (const node of nodes) widths.set(node, initialWidth(node, specs));

	for (let pass = 0; pass <= nodes.length; pass++) {
		let changed = false;
		for (const node of nodes) {
			if (isPinnedWidth(node, specs)) continue;
			const w = Math.max(widths.get(node) ?? 1, ...inputWidths(node, widths));
			if (w !== widths.get(node)) {
				widths.set(node, w);
				changed = true;
			}
		}
		if (!changed) return widths;
	}
	throw new Error("width resolution did not converge (internal error)");
}

function isPinnedWidth(node: GNode, specs?: SpecTable): boolean {
	return (
		resolveSpec(node.module, specs).policy === "reduce" || typeof node.config.__width === "number"
	);
}

function initialWidth(node: GNode, specs?: SpecTable): number {
	if (resolveSpec(node.module, specs).policy === "reduce") return 1;
	const pinned = node.config.__width;
	return typeof pinned === "number" ? pinned : 1;
}

function inputWidths(node: GNode, widths: Map<GNode, number>): number[] {
	return Object.values(node.inputs).map((value) => sourceWidth(value, widths));
}

function sourceWidth(value: InputValue, widths: Map<GNode, number>): number {
	if (typeof value === "number" || isLambdaInput(value)) return 1;
	if (isNodeRef(value)) return value.lane !== undefined ? 1 : (widths.get(value.node) ?? 1);
	if (isZRef(value)) return widths.get(value.z.node) ?? 1;
	return 1; // patterns are expanded before width resolution
}
