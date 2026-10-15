/**
 * The integer range of an expression (int-range.ts), when it is known while
 * compiling: constants, int locals, integer typed-array elements read at an
 * index proven in bounds, and the operators and Math functions that keep
 * integers exact. Like static-value.ts it only reads: no code is emitted.
 * Null means "maybe not an integer" — any f64, a boolean, NaN, -0.
 */

import type { AnyNode, MemberExpression, UnaryExpression } from "acorn";
import type { ElementType } from "../layout/element-type";
import type { FnEmitter } from "./fn-emitter";
import { binaryRange } from "./int-range-binary";
import { mathRange } from "./int-range-math";
import {
	INT32,
	type Range,
	UINT32,
	constantRange,
	fitsI32,
	includes,
	safeRange,
	union,
	within,
} from "./int-range";
import { resolve } from "./resolve";
import { staticOf } from "./static-value";

export function intRange(e: FnEmitter, node: AnyNode): Range | null {
	const folded = staticOf(e, node);
	if (folded !== null) return constantRange(folded.v);
	switch (node.type) {
		case "Identifier":
		case "MemberExpression":
			return node.type === "MemberExpression" && node.computed
				? elementRange(e, node)
				: localRange(resolve(e, node));
		case "UnaryExpression":
			return unaryRange(e, node);
		case "BinaryExpression":
			return binaryRange(e, node);
		case "ConditionalExpression":
			return union(intRange(e, node.consequent), intRange(e, node.alternate));
		case "LogicalExpression":
			// `a && b` is `a` (then 0) or `b`; `??` reads an element that may be missing.
			return node.operator === "??" ? null : union(intRange(e, node.left), intRange(e, node.right));
		case "CallExpression":
			return mathRange(e, node);
		default:
			return null;
	}
}

/** `property` indexes an array of `length` elements and is always in bounds. */
export function provenIndex(e: FnEmitter, property: AnyNode, length: number): boolean {
	return within(intRange(e, property), 0, length - 1);
}

const ELEMENT_RANGES: Readonly<Partial<Record<ElementType, Range>>> = {
	i32: INT32,
	u32: UINT32,
	i16: { lo: -32768, hi: 32767 },
	u16: { lo: 0, hi: 65535 },
	i8: { lo: -128, hi: 127 },
	u8: { lo: 0, hi: 255 },
	u8c: { lo: 0, hi: 255 },
};

function localRange(value: ReturnType<typeof resolve>): Range | null {
	if (value?.k !== "local" || value.kind !== "int") return null;
	return value.range ?? INT32;
}

/** An integer array's element at an index proven in bounds (an index out of bounds reads `undefined`). */
function elementRange(e: FnEmitter, node: MemberExpression): Range | null {
	const owner = resolve(e, node.object);
	if (owner?.k !== "memory" || owner.shape.k !== "array") return null;
	const range = ELEMENT_RANGES[owner.shape.type];
	if (range === undefined || !provenIndex(e, node.property, owner.shape.length)) return null;
	return range;
}

function unaryRange(e: FnEmitter, node: UnaryExpression): Range | null {
	const r = intRange(e, node.argument);
	switch (node.operator) {
		case "+":
			return r;
		case "-":
			// -0 is not an integer here.
			return r === null || includes(r, 0) ? null : safeRange(-r.hi, -r.lo);
		case "~":
			return fitsI32(r) ? { lo: ~r.hi, hi: ~r.lo } : INT32;
		default:
			return null;
	}
}
