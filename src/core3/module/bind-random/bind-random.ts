/**
 * Route a tick's randomness through its state, as plain subset text calling
 * the random library (random-helpers.ts). With the state named `s`:
 *
 *   Math.random()        ((s.__rng = __random_nextRng(s.__rng)) / 4294967295)
 *   hashRandom(key)      __random_hashNumber(key, s.__seed)
 *   hashRandom("kick")   __random_hashKey(<fnv1a32 of "kick">, s.__seed)
 *
 * `__rng` is the lane's stream position, `__seed` the patch seed (or the
 * node's own). A key that may be a config string cannot fold here (config
 * is per node), so it is an error (config-key.ts). Every backend runs the bound text as it is. Edits stay on
 * their lines, so runtime stack traces keep the source's line numbers.
 */

import type { AnyNode, CallExpression } from "acorn";
import { fnv1a32 } from "../../hash/fnv1a32";
import { type TextEdit, applyEdits } from "../tick-build/text-edits";
import { parseFunction } from "../front/parse/parse-function";
import { walk } from "../front/parse/walk";
import { configKeyCheck } from "./config-key";
import { RANDOM_HELPER_PREFIX } from "./random-helpers";

export interface RandomRewrite {
	readonly text: string;
	/** The library functions the text now calls. */
	readonly uses: ReadonlySet<string>;
}

export function bindRandom(
	src: string,
	what: string,
	config: Readonly<Record<string, unknown>>,
): RandomRewrite {
	const parsed = parseFunction(src, what);
	const uses = new Set<string>();
	const first = parsed.node.params[0];
	if (first === undefined || first.type !== "Identifier") return { text: src, uses };
	const suspect = configKeyCheck(parsed.node, config);
	const edits: TextEdit[] = [];
	walk(parsed.node.body, (node) => {
		if (node.type !== "CallExpression") return;
		const call = callEdits(node, first.name, uses);
		if (call.numberKey !== null) assertNumberKey(call.numberKey, suspect, parsed.expression, what);
		edits.push(...call.edits);
	});
	const local = edits.map((e) => ({
		...e,
		start: e.start - parsed.offset,
		end: e.end - parsed.offset,
	}));
	return { text: applyEdits(src, local), uses };
}

interface CallEdits {
	readonly edits: TextEdit[];
	/** The key of a `hashRandom` call hashed as a number, else null. */
	readonly numberKey: AnyNode | null;
}

function callEdits(call: CallExpression, state: string, uses: Set<string>): CallEdits {
	if (isMathRandom(call.callee) && call.arguments.length === 0) {
		uses.add("nextRng");
		const draw = `((${state}.__rng = ${helper("nextRng")}(${state}.__rng)) / 4294967295)`;
		return { edits: [{ start: call.start, end: call.end, text: draw }], numberKey: null };
	}
	const key = call.arguments[0];
	if (call.callee.type !== "Identifier" || call.callee.name !== "hashRandom" || key === undefined)
		return { edits: [], numberKey: null };
	const callee = { start: call.callee.start, end: call.callee.end };
	const seed = `, ${state}.__seed`;
	if (key.type === "Literal" && typeof key.value === "string") {
		uses.add("hashKey");
		const edits = [
			{ ...callee, text: helper("hashKey") },
			{ start: key.start, end: key.end, text: `${fnv1a32(key.value)}${seed}` },
		];
		return { edits, numberKey: null };
	}
	uses.add("hashNumber");
	// An insertion after the key, so a draw inside the key is still rewritten.
	const edits = [
		{ ...callee, text: helper("hashNumber") },
		{ start: key.end, end: key.end, text: seed },
	];
	return { edits, numberKey: key };
}

/** A key hashed as a number must not be a config string (config-key.ts): that is an error, never a coercion. */
function assertNumberKey(
	key: AnyNode,
	suspect: (key: AnyNode) => string | null,
	text: string,
	what: string,
): void {
	const read = suspect(key);
	if (read === null) return;
	throw new Error(
		`${what}: hashRandom key \`${text.slice(key.start, key.end)}\` reads ${read}, which is not declared a number. Config is per node, so a config string cannot fold to its hash when the module binds; use a number key or a string literal`,
	);
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
