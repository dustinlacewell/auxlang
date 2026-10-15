/**
 * From the spec `defmod` receives to the spec the engine runs. The tick and
 * helpers are read back as source text, checked against the tick subset, and
 * the tick is rebuilt from that text with its names bound. The source text is
 * kept on the spec (`source`): it is what crosses to the worklet.
 */

import type { ModuleSource, ModuleSpec } from "../types";
import { buildTick } from "./tick-build/build-tick";
import { checkModule } from "./tick-subset/check-module";
import { EXEMPT_MODULES } from "./tick-subset/exempt";

/** A spec as written: `helpers` are functions the tick may call by name. */
export interface WrittenSpec extends ModuleSpec {
	readonly helpers?: Readonly<Record<string, (...args: never[]) => unknown>>;
}

export function bindModule(written: WrittenSpec): ModuleSpec {
	const { helpers, ...spec } = written;
	if (EXEMPT_MODULES.has(spec.name)) return spec;
	const source = sourceOf(written.tick, helpers ?? {});
	checkModule(spec, source);
	return { ...spec, tick: buildTick(source, `defmod('${spec.name}')`), source };
}

function sourceOf(
	tick: ModuleSpec["tick"],
	helpers: Readonly<Record<string, (...args: never[]) => unknown>>,
): ModuleSource {
	const texts: Record<string, string> = {};
	for (const [name, fn] of Object.entries(helpers)) texts[name] = fn.toString();
	return { tick: tick.toString(), helpers: texts };
}
