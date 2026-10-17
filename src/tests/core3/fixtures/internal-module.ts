/**
 * Feeds the compiler backend at its real seam (module/define-internal-module)
 * instead of the public patch language. `evalInternal` runs patch text whose
 * `defineInternalModule({...})` calls reach that entry via evalPatch's
 * extraScope. Compiler tests only; not part of the patch language.
 *
 * `writes` defaults to every field a trial `state()` returns (conservative:
 * all carry), so these specs get the module-name re-eval kind (compile/
 * kind.ts), same as every shape-C module.
 */

import type { WrittenSpec } from "@/core3/module/bind-module";
import {
	defineInternalModule as defineInternalModuleRaw,
	type InternalModuleSpec,
	type InternalModuleSpecWithoutWrites,
} from "@/core3/module/define-internal-module";
import { moduleFactory } from "@/core3/patch/factory";
import type { Handle } from "@/core3/patch/handle-data";
import type { PortAnn } from "@/core3/types";
import { evalPatch, type EvalPatchOptions } from "@/ui/core3-playground/eval-patch";

const TRIAL_SAMPLE_RATE = 48000;

/**
 * `defineInternalModule` with `writes` defaulted (see header), returning the
 * module's factory — the same ergonomics the deleted object-form `defmod`
 * had (`const m = defineInternalModule({...}); m().out()`), and the name
 * bound into evalInternal's extraScope.
 */
export function defineInternalModule<
	I extends Record<string, PortAnn>,
	O extends Record<string, PortAnn>,
>(spec: InternalModuleSpecWithoutWrites<I, O>): (...args: unknown[]) => Handle {
	const written = spec as unknown as WrittenSpec;
	const withWrites = written.writes !== undefined ? written : { ...written, writes: defaultWrites(written) };
	return moduleFactory(defineInternalModuleRaw(withWrites as unknown as InternalModuleSpec<I, O>));
}

function defaultWrites(spec: WrittenSpec): readonly string[] {
	if (spec.state === undefined) return [];
	return Object.keys(spec.state(TRIAL_SAMPLE_RATE, {}));
}

/** `evalPatch`, with `defineInternalModule` bound into its scope. */
export function evalInternal(code: string, opts: EvalPatchOptions = {}) {
	return evalPatch(code, { ...opts, extraScope: { ...opts.extraScope, defineInternalModule } });
}
