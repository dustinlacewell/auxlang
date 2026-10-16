/**
 * `positionalArgs`: a module's full positional-argument order — the chained
 * default input (the first in `inputOrder`), if any, then the rest (MANIFESTO
 * §5). Shared by shape-C `defmod` (lower-module) and `defpatch`
 * (patch/defpatch): `meta.args`, when given, names the inputs AFTER the
 * default input, each at most once; the default input itself must not appear,
 * since it is never positional (it is the chain target). An input `args`
 * omits is still connectable by name, just not positionally. Absent `args`
 * default to the remaining inputs in declared order.
 */

export function positionalArgs(
	inputOrder: readonly string[],
	args: readonly string[] | undefined,
	owner: string,
): readonly string[] {
	const defaultIn = inputOrder[0];
	const rest = defaultIn === undefined ? inputOrder : inputOrder.slice(1);
	const after = args === undefined ? rest : validatedArgs(rest, args, defaultIn, owner);
	return defaultIn === undefined ? after : [defaultIn, ...after];
}

function validatedArgs(
	rest: readonly string[],
	args: readonly string[],
	defaultIn: string | undefined,
	owner: string,
): readonly string[] {
	if (defaultIn !== undefined && args.includes(defaultIn)) {
		throw new Error(`${owner}: meta.args names '${defaultIn}', the default input — it is not positional`);
	}
	const unknown = args.find((port) => !rest.includes(port));
	if (unknown !== undefined) {
		throw new Error(`${owner}: meta.args names '${unknown}', which is not an input`);
	}
	const seen = new Set<string>();
	for (const port of args) {
		if (seen.has(port)) throw new Error(`${owner}: meta.args names '${port}' twice`);
		seen.add(port);
	}
	return args;
}
