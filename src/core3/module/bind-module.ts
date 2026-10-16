/**
 * From the spec `defmod` receives to the spec the engine runs. The tick and
 * helpers are read back as source text and bound to auxlang's math
 * (bind-math/) and random library (bind-random/), and the tick is rebuilt
 * from that text with its names bound. The bound text is kept on the spec
 * (`source`) and read once by the front end, against the tick subset; the
 * result is kept with the spec (front/module/check-module.ts): build reads
 * that result, never the text. Binding keeps the parts' lines, so a loud
 * error names the line the author wrote.
 */

import type { ModuleSource, ModuleSpec, SourceOrigin } from "../types";
import { bindModuleMath } from "./bind-math/bind-module-math";
import { bindModuleRandom } from "./bind-random/bind-module-random";
import { libraryPrefixOf } from "./library-names";
import { locateInSource } from "./source-text";
import { buildTick } from "./tick-build/build-tick";
import { type ReadTime, checkModule } from "./front/module/check-module";

/** A spec as written: `helpers` are functions the tick may call by name. */
export interface WrittenSpec extends ModuleSpec {
	readonly helpers?: Readonly<Record<string, (...args: never[]) => unknown>>;
}

/** `read`: when the front end reads the bound text (front/module/check-module.ts). */
export function bindModule(written: WrittenSpec, read: ReadTime): ModuleSpec {
	const { helpers, ...spec } = written;
	const owner = `defmod('${spec.name}')`;
	const written_ = sourceOf(written.tick, helpers ?? {}, owner);
	const bound = bindModuleRandom(bindModuleMath(written_, owner), owner);
	const source = withOrigins(bound, written_);
	const result = { ...spec, tick: buildTick(source, owner), source };
	checkModule(result, source, read);
	return result;
}

/** Where the written parts start in the file being evaluated; binding keeps their lines. */
function withOrigins(bound: ModuleSource, written: ModuleSource): ModuleSource {
	const origins: Record<string, SourceOrigin> = {};
	const find = (part: string, text: string) => {
		const origin = locateInSource(text);
		if (origin !== null) origins[part] = origin;
	};
	find("tick", written.tick);
	for (const [name, text] of Object.entries(written.helpers)) find(`helper '${name}'`, text);
	return Object.keys(origins).length === 0 ? bound : { ...bound, origins };
}

function sourceOf(
	tick: ModuleSpec["tick"],
	helpers: Readonly<Record<string, (...args: never[]) => unknown>>,
	owner: string,
): ModuleSource {
	const texts: Record<string, string> = {};
	for (const [name, fn] of Object.entries(helpers)) {
		const prefix = libraryPrefixOf(name);
		if (prefix !== undefined)
			throw new Error(
				`${owner}: helper names starting with '${prefix}' are reserved for auxlang's library`,
			);
		texts[name] = fn.toString();
	}
	return { tick: tick.toString(), helpers: texts };
}
