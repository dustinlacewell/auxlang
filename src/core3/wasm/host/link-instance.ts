/**
 * An instance of a compiled program and the link its one import calls
 * through: `env.fill` (the tables' miss path) goes to the engine's tables,
 * which exist only once the instance's memory does (wasm-engine.ts sets
 * them). Two ways to make one:
 *
 * - `linkInstance`: synchronous, for the worklet's build step and tests.
 * - `linkInstanceAsync`: for the main thread, where Chrome refuses a
 *   synchronous instance of a module over 4 KB.
 */

import type { SeqTables } from "./seq-tables";

export class FillLink {
	tables: SeqTables | null = null;

	readonly imports: WebAssembly.Imports = {
		env: {
			fill: (node: number, lane: number, cycle: number) =>
				(this.tables as SeqTables).fill(node, lane, cycle),
		},
	};
}

export interface LinkedInstance {
	readonly instance: WebAssembly.Instance;
	readonly link: FillLink;
}

export function linkInstance(module: WebAssembly.Module): LinkedInstance {
	const link = new FillLink();
	return { instance: new WebAssembly.Instance(module, link.imports), link };
}

export async function linkInstanceAsync(module: WebAssembly.Module): Promise<LinkedInstance> {
	const link = new FillLink();
	return { instance: await WebAssembly.instantiate(module, link.imports), link };
}
