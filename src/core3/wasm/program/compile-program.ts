/**
 * A built program to one WebAssembly module (MANIFESTO §8): every node's
 * checked tick inlined into one `render(n)` function, the helpers, each
 * signal lambda and auxlang's math compiled from their JS source into the
 * same module, state
 * in linear memory at a layout fixed from the built states, the event tables
 * in a heap above it (layout/table-format.ts). The module imports
 * `env.fill(node, lane, cycle)` (the miss path, table-enter.ts) and exports
 * `render` and `memory`.
 */

import type { ModuleIR } from "../../module/front/module/module-ir";
import type { NodeRun } from "../../runtime/node-run";
import type { NodePlans } from "../../runtime/specialise/specialise-nodes";
import { FunctionTable } from "../compile/function-table";
import { Functions } from "../compile/functions";
import { moduleBytes } from "../encode/module-bytes";
import { F64, I32 } from "../encode/opcodes";
import { emitRender } from "./emit-render";
import type { LambdaSources } from "./lambda-sources";
import { type WasmLayout, planMemory } from "./memory-layout";
import { ENTER_PARAMS, tableEnter } from "./table-enter";

/** The host's `env.fill` import: the first function index. */
const FILL = 0;

export interface WasmInput {
	readonly runs: readonly NodeRun[];
	/** Each node's module name. */
	readonly modules: readonly string[];
	/** Each node's module declares `reads: "pattern"`: its lanes get event tables. */
	readonly readsPattern: readonly boolean[];
	/** Each node's module, as the front end reads it (module/front/module/spec-ir.ts). */
	readonly irs: readonly ModuleIR[];
	/** Each node lane's tick plan (runtime/specialise/specialise-nodes.ts). */
	readonly plans: NodePlans;
	/** Each node lane's signal lambdas (lambda-sources.ts). */
	readonly lambdas: LambdaSources;
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
	const layout = planMemory(input.runs, input.readsPattern, input.irs, input.lambdas, input.size);
	const table = new FunctionTable(1);
	const fillType = table.typeIndex([I32, I32, F64], []);
	const enter = table.add(tableEnter(table.typeIndex(ENTER_PARAMS, []), FILL));
	const fns = new Functions(table);
	const render = table.reserve();
	const body = emitRender({ ...input, memory: layout, enter }, fns, table);
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
