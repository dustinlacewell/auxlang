/**
 * How the main thread prepares programs for the worklet: which engine the
 * worklet runs, and for the JS engine its driver options (driver.ts).
 *
 * - "js": the interpreter, or a generated JS driver when `codegen` is set.
 * - "wasm": the program compiled to one WebAssembly module
 *   (prepare-wasm-program.ts); the driver options other than `build` do
 *   not apply.
 */

import type { DriverOptions } from "../driver";

export type Backend = "js" | "wasm";

export const DEFAULT_BACKEND: Backend = "js";

export interface HostOptions extends DriverOptions {
	readonly backend?: Backend;
}
