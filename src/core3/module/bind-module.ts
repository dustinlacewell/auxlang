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
import { assertAuthorNames } from "./assert-author-names";
import { bindModuleMath } from "./bind-math/bind-module-math";
import { bindModuleRandom } from "./bind-random/bind-module-random";
import { bindSugar } from "./bind-sugar/bind-sugar";
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
	return bindSource(spec, written_, read);
}

/**
 * Binds a spec to a source already in hand: `written.origins`, when present,
 * are used as-is and no text search runs; otherwise origins are found by
 * `withOrigins` as `bindModule` has always done.
 */
export function bindSource(spec: ModuleSpec, written: ModuleSource, read: ReadTime): ModuleSpec {
	const owner = `defmod('${spec.name}')`;
	const sugared = sugarSource(written, owner);
	const bound = bindModuleRandom(bindModuleMath(sugared, owner), owner);
	const source =
		written.origins !== undefined ? { ...bound, origins: written.origins } : withOrigins(bound, written);
	const result = { ...spec, tick: buildTick(source, owner), source };
	checkModule(result, source, read);
	return result;
}

/** Lifts the tick's and each helper's compiler shortcuts (bind-sugar/) into forms the tick subset already accepts. */
function sugarSource(written: ModuleSource, owner: string): ModuleSource {
	const tick = bindSugar(written.tick, `${owner} tick`);
	const helpers: Record<string, string> = {};
	for (const [name, src] of Object.entries(written.helpers)) {
		helpers[name] = bindSugar(src, `${owner} helper '${name}'`);
	}
	return { ...written, tick, helpers };
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
	const tickText = tick.toString();
	assertAuthorNames(tickText, `${owner} tick`);
	const texts: Record<string, string> = {};
	for (const [name, fn] of Object.entries(helpers)) {
		const prefix = libraryPrefixOf(name);
		if (prefix !== undefined)
			throw new Error(
				`${owner}: helper names starting with '${prefix}' are reserved for auxlang's library`,
			);
		const helperText = fn.toString();
		assertAuthorNames(helperText, `${owner} helper '${name}'`);
		texts[name] = helperText;
	}
	return { tick: tickText, helpers: texts };
}
