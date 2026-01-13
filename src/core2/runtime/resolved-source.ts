/**
 * Resolved source for runtime - what an input actually connects to.
 *
 * After compilation, all inputs are resolved to one of these forms.
 */

import type { NodeId } from "../graph/node";
import type { SignalLambda } from "../signal/signal-lambda";

export type ResolvedSource =
	| { readonly type: "constant"; readonly value: number }
	| { readonly type: "connection"; readonly nodeId: NodeId; readonly output: string }
	| { readonly type: "lambda"; readonly fn: SignalLambda };
