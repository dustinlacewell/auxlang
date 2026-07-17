/**
 * Typed thin wrappers over `defineModule`. They exist purely to give each
 * module's `tick` precise parameter types: input/output names become concrete
 * keys (so `i.cutoff` is `number`, not `number | undefined` under
 * noUncheckedIndexedAccess), while the value still satisfies the erased
 * `ModuleSpec` contract the registry stores.
 */

import { defineModule } from "../module/define";
import type { ModuleSpec, PortAnn } from "../types";

type Ins<I extends Record<string, PortAnn>> = { [K in keyof I]: number };
type Outs<O extends Record<string, PortAnn>> = { [K in keyof O]: number };
type St = Record<string, unknown>;
type Cfg = Record<string, unknown>;

interface MapSpec<I extends Record<string, PortAnn>, O extends Record<string, PortAnn>> {
	readonly name: string;
	readonly ins: I;
	readonly outs: O;
	readonly config?: Cfg;
	readonly positional?: readonly string[];
	readonly defaultIn: keyof I & string;
	readonly defaultOut: keyof O & string;
	readonly state?: (sampleRate: number) => St;
	readonly tick: (s: St, i: Ins<I>, o: Outs<O>, config: Cfg, sampleRate: number) => void;
}

interface ReduceSpec<I extends Record<string, PortAnn>, O extends Record<string, PortAnn>> {
	readonly name: string;
	readonly ins: I;
	readonly outs: O;
	readonly config?: Cfg;
	readonly positional?: readonly string[];
	readonly defaultIn: keyof I & string;
	readonly defaultOut: keyof O & string;
	readonly state?: (sampleRate: number) => St;
	readonly tick: (
		s: St,
		i: { [K in keyof I]: Float32Array | number },
		o: Outs<O>,
		config: Cfg,
		sampleRate: number,
		width: number,
	) => void;
}

export function defineMap<
	I extends Record<string, PortAnn>,
	O extends Record<string, PortAnn>,
>(spec: MapSpec<I, O>): ModuleSpec {
	return defineModule(spec as unknown as ModuleSpec);
}

export function defineReduce<
	I extends Record<string, PortAnn>,
	O extends Record<string, PortAnn>,
>(spec: ReduceSpec<I, O>): ModuleSpec {
	return defineModule({ ...spec, policy: "reduce" } as unknown as ModuleSpec);
}
