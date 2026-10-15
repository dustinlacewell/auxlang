/**
 * Bind a module's math (MANIFESTO §5.1, §7): its tick and helpers call
 * auxlang's math in place of host transcendentals, and the math functions
 * they reach join its helpers. The result is still plain source text, so the
 * interpreter (tick-build) and the codegen paster run the same math.
 */

import type { ModuleSource } from "../../types";
import { mathHelpers } from "./math-helpers";
import { rewriteMath } from "./rewrite-math";

export function bindModuleMath(source: ModuleSource, owner: string): ModuleSource {
	const uses = new Set<string>();
	const rewrite = (src: string, part: string): string => {
		const out = rewriteMath(src, `${owner} ${part}`);
		for (const name of out.uses) uses.add(name);
		return out.text;
	};
	const tick = rewrite(source.tick, "tick");
	const helpers: Record<string, string> = {};
	for (const [name, src] of Object.entries(source.helpers)) {
		helpers[name] = rewrite(src, `helper '${name}'`);
	}
	return { tick, helpers: { ...helpers, ...mathHelpers(uses) } };
}
