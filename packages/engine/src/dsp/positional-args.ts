/**
 * `positionalArgs`: a module's full positional-argument order (MANIFESTO
 * §5). Shared by shape-C `defmod` (lower-module), `defpatch`, and its
 * sub-patch backend (`patch/subpatch/define-subpatch`).
 *
 * `meta.args`, when given, IS the complete positional list, written out as
 * the author wants it: an entry may be the default input at any slot or
 * omit it entirely (kick/snare/env/fm exclude it; button is `[]`; osc is
 * `[pitch, min, max]`; seq is `["pattern", "position"]` with `position` the
 * default input, not first). Entries are inputs or (for a module with
 * config — `defmod` only, via `configKeys`; a sub-patch has none) config
 * keys, each at most once. Unknown names throw. A name `args` omits is
 * still connectable by name, just not positionally.
 *
 * Absent `args`, the default stays today's: all inputs in declared order,
 * default input first. `build-node.ts`'s `assign` already resolves a
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
	if (args === undefined) return inputOrder;
	return validatedArgs(inputOrder, args, configKeys, owner);
}

function validatedArgs(
	inputOrder: readonly string[],
	args: readonly string[],
	configKeys: ReadonlySet<string>,
	owner: string,
): readonly string[] {
	const unknown = args.find((name) => !inputOrder.includes(name) && !configKeys.has(name));
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
