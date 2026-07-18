/**
 * `out()` — the only effect in the language. Creates an `out` module node and
 * registers it as a root of the current eval. Two shapes reach the master bus:
 *
 *  - `out(x)` — mono/poly source into the auto-spread `in` jack.
 *  - `out({ l, r })` — explicit stereo: patch a pre-panned source's two channels
 *    straight to the master's left/right jacks. This is how a `pan` (or any
 *    stereo effect) keeps its own placement instead of being re-spread by index.
 *
 * A bare `.out()` chained off a stereo source (a node whose default output is
 * one of a matched `l`/`r` pair) is a LOUD error: forwarding only the default
 * output would silently discard the other channel. The user must name both
 * jacks explicitly.
 */

import type { GNode, InputValue } from "../graph/node";
import { getModule } from "../module/define";
import type { ModuleSpec } from "../types";
import { evalCtx } from "./context";
import { type HandleData, handleData, isHandle } from "./handle-data";
import { lift, refFromHandle } from "./lift";

/** The master's stereo jacks; an object arg may name only these. */
const STEREO_JACKS = ["l", "r"] as const;

/** Build the `out` node with the given input bindings and root it. */
function rootOut(inputs: Record<string, InputValue>): void {
	const ctx = evalCtx("out()");
	const node: GNode = { module: "out", inputs, config: {} };
	ctx.roots.push(node);
}

/** `out(x)` — mono/poly source into the default (`in`) jack. */
export function addRoot(src: InputValue): void {
	const spec = getModule("out");
	rootOut({ [spec.defaultIn]: src });
}

export function out(value: unknown): void {
	if (isStereoArgs(value)) {
		rootOut(liftStereoJacks(value as Record<string, unknown>));
		return;
	}
	if (isHandle(value)) {
		rootFromHandle(handleData(value));
		return;
	}
	addRoot(lift(value, "out()"));
}

/** A plain object naming stereo jacks (not itself a signal value). */
function isStereoArgs(v: unknown): boolean {
	if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
	if (isHandle(v)) return false;
	const o = v as Record<string, unknown>;
	if (typeof o.module === "string" && typeof o.inputs === "object") return false; // raw GNode
	if (typeof o.ast === "object" && o.ast !== null) return false; // P-like pattern
	return STEREO_JACKS.some((j) => j in o);
}

function liftStereoJacks(named: Record<string, unknown>): Record<string, InputValue> {
	const inputs: Record<string, InputValue> = {};
	for (const [key, value] of Object.entries(named)) {
		if (!STEREO_JACKS.includes(key as (typeof STEREO_JACKS)[number])) {
			throw new Error(
				`out({ ... }): unknown jack '${key}'. The stereo form names only [${STEREO_JACKS.join(", ")}]. For a mono source use out(x).`,
			);
		}
		inputs[key] = lift(value, `out.${key}`);
	}
	return inputs;
}

/**
 * The handle's `.out()`. Forwards the tapped output into `in`, unless the source
 * is stereo and no channel was named — then it is a loud error, because
 * silently keeping only the default output drops the other channel.
 */
export function rootFromHandle(data: HandleData): void {
	const spec = getModule(data.node.module);
	if (data.port === undefined && isStereoSource(spec)) {
		throw stereoSourceError(spec);
	}
	addRoot(refFromHandle(data));
}

/** A source is stereo when its default output is one of a matched `l`/`r` pair. */
function isStereoSource(spec: ModuleSpec): boolean {
	return (
		"l" in spec.outs && "r" in spec.outs && STEREO_JACKS.includes(spec.defaultOut as "l" | "r")
	);
}

function stereoSourceError(spec: ModuleSpec): Error {
	return new Error(
		`${spec.name} is stereo (outputs l + r) — patch both channels explicitly: ` +
			`out({ l: x.l, r: x.r }). A bare .out() would keep only '${spec.defaultOut}' and drop the other channel.`,
	);
}
