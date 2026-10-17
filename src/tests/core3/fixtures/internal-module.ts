/**
 * Feeds the compiler backend at its real seam (module/define-internal-module)
 * instead of the public patch language. `evalInternal` runs patch text whose
 * `defineInternalModule({...})` calls reach that entry via evalPatch's
 * extraScope — the backend accepts the same internal spec shape the deleted
 * public object-form `defmod` used to dispatch on. Compiler tests only; not
 * part of the patch language.
 *
 * `writes` defaults to every field a trial `state()` returns (conservative:
 * all carry), so these specs get the module-name re-eval kind (compile/
 * kind.ts), same as shape C — the old object form's hash-kind behavior is
 * covered by shape-c.test.ts / defpatch.test.ts, not by these tests.
 */

import type { WrittenSpec } from "@/core3/module/bind-module";
import { defineInternalModule as defineInternalModuleRaw } from "@/core3/module/define-internal-module";
import type { DefmodSpec } from "@/core3/patch/defmod";
import { moduleFactory } from "@/core3/patch/factory";
import type { Handle } from "@/core3/patch/handle-data";
import type { PortAnn } from "@/core3/types";
import { evalPatch, type EvalPatchOptions } from "@/ui/core3-playground/eval-patch";

const TRIAL_SAMPLE_RATE = 48000;

/**
 * `defineInternalModule` with `writes` defaulted (see header), returning the
 * module's factory — the same ergonomics the deleted object-form `defmod`
 * had (`const m = defineInternalModule({...}); m().out()`), and the name
 * bound into evalInternal's extraScope. Typed like `defmod`'s object-form
 * overload (DefmodSpec<I, O>) so a literal tick's `(s, i, o)` still infers,
 * same as it did through the deleted overload.
 */
export function defineInternalModule<
	I extends Record<string, PortAnn>,
	O extends Record<string, PortAnn>,
>(spec: DefmodSpec<I, O>): (...args: unknown[]) => Handle {
	const written = spec as unknown as WrittenSpec;
	const withWrites = written.writes !== undefined ? written : { ...written, writes: defaultWrites(written) };
	return moduleFactory(defineInternalModuleRaw(withWrites));
}

function defaultWrites(spec: WrittenSpec): readonly string[] {
	if (spec.state === undefined) return [];
	return Object.keys(spec.state(TRIAL_SAMPLE_RATE, {}));
}

/** `evalPatch`, with `defineInternalModule` bound in place of the deleted public `defmod({...})` object form. */
export function evalInternal(code: string, opts: EvalPatchOptions = {}) {
	return evalPatch(code, { ...opts, extraScope: { ...opts.extraScope, defineInternalModule } });
}
