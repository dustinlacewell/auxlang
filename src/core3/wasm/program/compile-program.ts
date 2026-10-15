/**
 * A built program to one WebAssembly module (MANIFESTO §8): every node's
 * checked tick inlined into one `render(n)` function, the helpers and
 * auxlang's math compiled from their JS source into the same module, state
 * in linear memory at a layout fixed from the built states. The module
 * imports `env.fill(node, lane, cycle)` (the seq tables) and exports
 * `render` and `memory`.
 */

import type { NodeRun } from "../../runtime/node-run";
import type { ModuleSource } from "../../types";
import { BRIDGE_SOURCES } from "../bridge/bridge-sources";
import { FunctionTable } from "../compile/function-table";
import { Functions } from "../compile/functions";
import { moduleBytes } from "../encode/module-bytes";
import { F64, I32 } from "../encode/opcodes";
import { emitRender } from "./emit-render";
import { type WasmLayout, planMemory } from "./memory-layout";

export interface WasmInput {
	readonly runs: readonly NodeRun[];
	/** Each node's module name. */
	readonly modules: readonly string[];
	readonly tapsL: Int32Array;
	readonly tapsR: Int32Array;
	/** The engine's value slot count. */
	readonly size: number;
	readonly sampleRate: number;
}

export interface CompiledWasm {
	readonly bytes: Uint8Array<ArrayBuffer>;
	readonly layout: WasmLayout;
}

export function compileWasm(input: WasmInput): CompiledWasm {
	const sources = input.runs.map((run, i) => sourceOf(run, input.modules[i] as string));
	const layout = planMemory(input.runs, input.modules, sources, input.size);
	const table = new FunctionTable(1);
	const fillType = table.typeIndex([I32, I32, F64], []);
	const fns = new Functions(table);
	const render = table.reserve();
	const body = emitRender({ ...input, sources, memory: layout, fill: 0 }, fns);
	table.define(render, { type: table.typeIndex([I32], []), locals: body.locals, body: body.body });
	const bytes = moduleBytes({
		types: table.allTypes(),
		imports: [{ module: "env", name: "fill", type: fillType }],
		funcs: table.allFuncs(),
		memoryPages: layout.pages,
		exports: [
			{ name: "render", kind: 0, index: render },
			{ name: "memory", kind: 2, index: 0 },
		],
	});
	return { bytes, layout };
}

function sourceOf(run: NodeRun, module: string): ModuleSource {
	const source = run.source ?? BRIDGE_SOURCES[module];
	if (source === undefined) throw new Error(`wasm: module '${module}' has no tick source`);
	return source;
}
