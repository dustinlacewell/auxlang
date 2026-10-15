/**
 * `.mod(port, signal, depth = 1)` — one more modulation source on a port
 * (MANIFESTO §5.2). The port's value is its base plus Σ(signal × depth);
 * setting the port still sets only the base. The signal binds like any value
 * at that port (a unit tag converts to the port's unit). Compile desugars the
 * terms into add/mul nodes (compile/expand-mods).
 */

import type { ModTerm } from "../graph/node";
import type { ModulePorts } from "../types";
import { bindInput } from "./bind-input";
import { lift } from "./lift";

type Mods = Readonly<Record<string, readonly ModTerm[]>>;

/** A new mods record with one more term on `port`; `mods` is not changed. */
export function withModTerm(
	mods: Mods | undefined,
	spec: ModulePorts,
	port: unknown,
	signal: unknown,
	depth: unknown,
): Record<string, readonly ModTerm[]> {
	assertInput(spec, port);
	const term: ModTerm = {
		signal: bindInput(spec, port, signal),
		depth: lift(depth, `${spec.name}.mod('${port}').depth`),
	};
	return { ...mods, [port]: [...(mods?.[port] ?? []), term] };
}

function assertInput(spec: ModulePorts, port: unknown): asserts port is string {
	if (typeof port === "string" && port in spec.ins) return;
	throw new Error(
		`${spec.name}.mod(${JSON.stringify(port)}, ...): not an input of '${spec.name}'. ` +
			`inputs: [${Object.keys(spec.ins).join(", ")}]`,
	);
}
