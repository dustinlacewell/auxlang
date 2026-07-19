/**
 * Worklet message protocol. Programs are plain data; library module code is
 * bundled into the worklet. Only user-written code crosses this boundary as
 * strings, riding inside the Program: inline lambdas (PortSrc "l" entries)
 * and patch-defined module specs (Program.specs, hydrated per engine by
 * runtime/hydrate-specs).
 */

import type { Program } from "../../types";

/** Main thread -> worklet. */
export type WorkletMessage =
	| { readonly type: "swap"; readonly program: Program }
	| { readonly type: "stop" };

/** Worklet -> main thread. Build failures must be loud, not swallowed. */
export type WorkletReply = { readonly type: "error"; readonly message: string };
