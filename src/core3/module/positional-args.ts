/**
 * `positionalArgs`: a module's full positional-argument order — the chained
 * default input (the first in `inputOrder`), if any, then the rest (MANIFESTO
 * §5). Shared by shape-C `defmod` (lower-module) and sub-patch modules
 * (patch/subpatch/define-subpatch): `meta.args`, when given, names the
 * inputs AFTER the default input and (for a module with config,
 * lower-module's `configKeys`) its config keys, each at most once; the
 * default input itself must not appear, since it is never positional (it is
 * the chain target). A name `args` omits is still connectable by name, just
 * not positionally. Absent `args` default to the remaining inputs in
 * declared order (config keys are never positional unless named). A
 * sub-patch module has no config, so it calls this with no `configKeys` and
 * validation stays ports-only. `build-node.ts`'s `assign` already resolves a
 * positional name against ports first, config second — the same path a
 * config key reaches by name — so a config-key entry here needs no new
 * runtime wiring.
 */

export function positionalArgs(
	inputOrder: readonly string[],
	args: readonly string[] | undefined,
	owner: string,
	configKeys: ReadonlySet<string> = new Set(),
): readonly string[] {
	const defaultIn = inputOrder[0];
	const rest = defaultIn === undefined ? inputOrder : inputOrder.slice(1);
	const after = args === undefined ? rest : validatedArgs(rest, args, defaultIn, configKeys, owner);
	return defaultIn === undefined ? after : [defaultIn, ...after];
}

function validatedArgs(
	rest: readonly string[],
	args: readonly string[],
	defaultIn: string | undefined,
	configKeys: ReadonlySet<string>,
	owner: string,
): readonly string[] {
	if (defaultIn !== undefined && args.includes(defaultIn)) {
		throw new Error(`${owner}: meta.args names '${defaultIn}', the default input — it is not positional`);
	}
	const unknown = args.find((name) => !rest.includes(name) && !configKeys.has(name));
	if (unknown !== undefined) {
		throw new Error(`${owner}: meta.args names '${unknown}', which is not an input or a config key`);
	}
	const seen = new Set<string>();
	for (const name of args) {
		if (seen.has(name)) throw new Error(`${owner}: meta.args names '${name}' twice`);
		seen.add(name);
	}
	return args;
}
