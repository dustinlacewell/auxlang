/**
 * A node input value - what can be connected to a device input.
 *
 * - number: constant value
 * - number[]: poly values (expanded in expandPoly pass)
 * - OutputRef: connection to another node's output
 *   - with voice?: pinned to specific voice (no expansion)
 *   - without voice: connects to all voices (triggers expansion)
 * - OutputRef[]: poly connections (from device-driven expansion)
 * - SignalLambda: per-sample function
 */

import type { OutputRef } from "../graph/output-ref";
import type { SignalLambda } from "./signal-lambda";

export type NodeInput =
	| number
	| number[]
	| OutputRef
	| OutputRef[]
	| SignalLambda;
