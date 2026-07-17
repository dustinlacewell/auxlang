/**
 * Worklet message protocol. Programs are plain data; module code is bundled
 * into the worklet (never stringified) — only user lambdas inside PortSrc "l"
 * entries cross this boundary as strings.
 */

import type { Program } from "../../types";

/** Main thread -> worklet. */
export type WorkletMessage =
	| { readonly type: "swap"; readonly program: Program }
	| { readonly type: "stop" };

/** Worklet -> main thread. Build failures must be loud, not swallowed. */
export type WorkletReply = { readonly type: "error"; readonly message: string };
