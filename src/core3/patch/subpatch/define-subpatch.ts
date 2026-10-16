/**
 * `defmod({ name, ins, outs, patch })` — saving a sub-patch as a module
 * (MANIFESTO §5). It gets the ports of any module: the first input is the
 * default input (the chain target), positional args follow `ins` order, the
 * first output is the default output, and outputs `l`/`r` make it stereo (no
 * default output). `ins` declare units with the same tags as ticks; a value
 * converts at the outer port, as for any module. With no `ins` it is a
 * self-contained source: nothing chains into it.
 *
 * A sub-patch has no tick, state, helpers, policy or config: `patch` is the
 * whole body. Registration is scope-aware like every defmod: root scope
 * writes the realm's sub-patch table, an eval writes its own.
 */

import { validateSpec } from "../../module/define";
import type { Category, PortAnn } from "../../types";
import { currentSubpatches, evalCtx } from "../context";
import { assertNoReservedPorts } from "../handle";
import { assertEvalNameFree, assertRootNameFree } from "../name-free";
import { registerSubpatch } from "./registry";
import type { SubpatchSpec } from "./subpatch-spec";

const KEYS = new Set(["name", "doc", "category", "ins", "outs", "patch"]);

export function defineSubpatch(written: Readonly<Record<string, unknown>>): SubpatchSpec {
	const spec = subpatchSpec(written);
	validateSpec(spec);
	assertNoReservedPorts(spec);
	register(spec);
	return spec;
}

/** Shape checks, then the derived port defaults. */
function subpatchSpec(written: Readonly<Record<string, unknown>>): SubpatchSpec {
	const name = written.name as string;
	assertKeys(name, written);
	if (typeof written.patch !== "function") {
		throw new Error(`defmod('${name}'): patch must be a function of the input handles`);
	}
	const ins = portRecord(name, "ins", written.ins, 0);
	const outs = portRecord(name, "outs", written.outs, 1);
	assertNoOptionalIns(name, ins);
	const inNames = Object.keys(ins);
	return {
		name,
		...(typeof written.doc === "string" ? { doc: written.doc } : {}),
		category: (written.category as Category | undefined) ?? "utils",
		ins,
		outs,
		positional: inNames,
		...(inNames.length > 0 ? { defaultIn: inNames[0] } : {}),
		...defaultOut(outs),
		patch: written.patch as SubpatchSpec["patch"],
	};
}

function assertKeys(name: string, written: Readonly<Record<string, unknown>>): void {
	if ("tick" in written) {
		throw new Error(
			`defmod('${name}'): tick and patch together. A module is either a tick or a sub-patch.`,
		);
	}
	for (const key of Object.keys(written)) {
		if (!KEYS.has(key)) {
			throw new Error(
				`defmod('${name}'): '${key}' does not apply to a sub-patch. ` +
					`A sub-patch takes [${[...KEYS].join(", ")}].`,
			);
		}
	}
}

/** `ins` may be empty (a self-contained source); `outs` needs at least one port. */
function portRecord(
	name: string,
	field: string,
	value: unknown,
	least: number,
): Record<string, PortAnn> {
	if (typeof value !== "object" || value === null || Object.keys(value).length < least) {
		throw new Error(
			`defmod('${name}'): ${field} must be a record of at least ${least} port annotation(s)`,
		);
	}
	for (const [port, ann] of Object.entries(value as Record<string, PortAnn>)) {
		if (ann.group !== undefined) {
			throw new Error(`defmod('${name}'): ${field} '${port}' is a port group. A sub-patch takes no port groups.`);
		}
	}
	return value as Record<string, PortAnn>;
}

/** Every input reaches the inner graph as a value, so it needs a default or must be connected. */
function assertNoOptionalIns(name: string, ins: Record<string, PortAnn>): void {
	for (const [port, ann] of Object.entries(ins)) {
		if (ann.opt) {
			throw new Error(
				`defmod('${name}'): input '${port}' is optional. A sub-patch input has a default or is required.`,
			);
		}
	}
}

/** Stereo outputs (`l` and `r`) connect by name and have no default; otherwise the first output. */
function defaultOut(outs: Record<string, PortAnn>): { defaultOut?: string } {
	if ("l" in outs && "r" in outs) return {};
	return { defaultOut: Object.keys(outs)[0] as string };
}

function register(spec: SubpatchSpec): void {
	if (currentSubpatches() === null) {
		assertRootNameFree(spec.name);
		registerSubpatch(spec);
		return;
	}
	assertEvalNameFree(spec.name);
	evalCtx("defmod()").subpatches.set(spec.name, spec);
}
