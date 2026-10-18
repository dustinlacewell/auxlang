/**
 * A `defmod` name must be free: no registered module or sub-patch has it, and
 * inside an eval it also may not shadow a patch-scope helper, a handle method,
 * or a module this patch already defined. Shared by tick and sub-patch forms.
 */

import { hasModule } from "../dsp/define";
import { evalCtx } from "./context";
import { RESERVED_HANDLE_NAMES } from "./reserved-handle-names";
import { RESERVED_SCOPE_NAMES } from "./scope-names";
import { rootSubpatches } from "./subpatch/registry";

/** Root scope: the realm tables only (buildUserScope checks the reserved names). */
export function assertRootNameFree(name: string): void {
	if (hasModule(name) || rootSubpatches().has(name)) {
		throw new Error(`module '${name}' already defined`);
	}
}

/** Eval scope: the full collision surface. */
export function assertEvalNameFree(name: string): void {
	const ctx = evalCtx("defmod()");
	if (hasModule(name) || rootSubpatches().has(name)) {
		throw new Error(`defmod('${name}'): '${name}' collides with a registered module`);
	}
	if (RESERVED_SCOPE_NAMES.has(name)) {
		throw new Error(
			`defmod('${name}'): '${name}' collides with a reserved patch-scope helper ` +
				`(${[...RESERVED_SCOPE_NAMES].join(", ")})`,
		);
	}
	if (RESERVED_HANDLE_NAMES.has(name)) {
		throw new Error(
			`defmod('${name}'): '${name}' collides with a reserved handle name ` +
				`(${[...RESERVED_HANDLE_NAMES].join(", ")})`,
		);
	}
	if (ctx.specs.has(name) || ctx.subpatches.has(name)) {
		throw new Error(`defmod('${name}'): '${name}' is already defined in this patch`);
	}
}
