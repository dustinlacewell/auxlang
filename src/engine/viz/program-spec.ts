/**
 * Layered spec lookup for Program consumers (graph rendering, tooltips):
 * a patch-defined module's doc surface (category, port annotations) rides in
 * `program.specs`; everything else comes from the bundled registry. Never
 * touches tick/state, so serialized and live specs are interchangeable here.
 */

import { getModule } from "../module/define";
import type { Category, PortAnn, Program } from "../types";

export interface SpecInfo {
	readonly category: Category;
	readonly ins: Record<string, PortAnn>;
	readonly outs: Record<string, PortAnn>;
}

export function programSpec(program: Program, name: string): SpecInfo {
	return program.specs?.find((s) => s.name === name) ?? getModule(name);
}
