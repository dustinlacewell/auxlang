/**
 * Engine-side hydration of patch-defined modules. `withProgramSpecs` compiles
 * the Program's serialized specs (module/serialize's `new Function` idiom,
 * already fenced with a trial run at the compile crossing) and layers them
 * OVER the bundled registry
 * in a fresh map. Pure: the base registry is never written, so each engine
 * owns its own layered view — a crossfade ticking two programs with
 * different same-named specs is safe.
 */

import { hydrateSpec } from "../module/serialize";
import type { ModuleSpec, Program, Registry } from "../types";

export function withProgramSpecs(base: Registry, program: Program): Registry {
	const specs = program.specs;
	if (specs === undefined || specs.length === 0) return base;
	const layered = new Map<string, ModuleSpec>(base);
	for (const s of specs) layered.set(s.name, hydrateSpec(s));
	return layered;
}
