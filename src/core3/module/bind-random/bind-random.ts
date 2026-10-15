/**
 * Route a tick's randomness through its state, as plain subset text calling
 * the random library (random-helpers.ts). With the state named `s`:
 *
 *   Math.random()        ((s.__rng = __random_nextRng(s.__rng)) / 4294967295)
 *   hashRandom(key)      __random_hashNumber(key, s.__seed)
 *   hashRandom("kick")   __random_hashKey(<fnv1a32 of "kick">, s.__seed)
 *
 * `__rng` is the lane's stream position, `__seed` the patch seed (or the
 * node's own). Every backend runs the bound text as it is. Edits stay on
 * their lines, so runtime stack traces keep the source's line numbers.
 */

import type { AnyNode, CallExpression } from "acorn";
import { fnv1a32 } from "../../hash/fnv1a32";
import { type TextEdit, applyEdits } from "../tick-build/text-edits";
import { parseFunction } from "../tick-subset/parse-function";
import { walk } from "../tick-subset/walk";
import { RANDOM_HELPER_PREFIX } from "./random-helpers";

export interface RandomRewrite {
	readonly text: string;
	/** The library functions the text now calls. */
	readonly uses: ReadonlySet<string>;
}

export function bindRandom(src: string, what: string): RandomRewrite {
	const parsed = parseFunction(src, what);
	const uses = new Set<string>();
	const first = parsed.node.params[0];
	if (first === undefined || first.type !== "Identifier") return { text: src, uses };
	const edits: TextEdit[] = [];
	walk(parsed.node.body, (node) => {
		if (node.type === "CallExpression") edits.push(...callEdits(node, first.name, uses));
	});
	const local = edits.map((e) => ({
		...e,
		start: e.start - parsed.offset,
		end: e.end - parsed.offset,
	}));
	return { text: applyEdits(src, local), uses };
}

function callEdits(call: CallExpression, state: string, uses: Set<string>): TextEdit[] {
	if (isMathRandom(call.callee) && call.arguments.length === 0) {
		uses.add("nextRng");
		const draw = `((${state}.__rng = ${helper("nextRng")}(${state}.__rng)) / 4294967295)`;
		return [{ start: call.start, end: call.end, text: draw }];
	}
	const key = call.arguments[0];
	if (call.callee.type !== "Identifier" || call.callee.name !== "hashRandom" || key === undefined)
		return [];
	const callee = { start: call.callee.start, end: call.callee.end };
	const seed = `, ${state}.__seed`;
	if (key.type === "Literal" && typeof key.value === "string") {
		uses.add("hashKey");
		return [
			{ ...callee, text: helper("hashKey") },
			{ start: key.start, end: key.end, text: `${fnv1a32(key.value)}${seed}` },
		];
	}
	uses.add("hashNumber");
	// An insertion after the key, so a draw inside the key is still rewritten.
	return [
		{ ...callee, text: helper("hashNumber") },
		{ start: key.end, end: key.end, text: seed },
	];
}

function helper(name: string): string {
	return RANDOM_HELPER_PREFIX + name;
}

function isMathRandom(callee: AnyNode): boolean {
	return (
		callee.type === "MemberExpression" &&
		!callee.computed &&
		callee.object.type === "Identifier" &&
		callee.object.name === "Math" &&
		callee.property.type === "Identifier" &&
		callee.property.name === "random"
	);
}
