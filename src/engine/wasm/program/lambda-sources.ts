/**
 * The signal lambdas of a program's nodes, as the engine gets them: per
 * node, per lane (one lane for a reducer, as `PNode.lanes`), input port →
 * the bound lambda and the front end's reading of it. Lambdas with the same
 * text share one reading.
 */

import { boundLambdaIR } from "../../module/front/module/bound-lambda-ir";
import type { FunctionIR } from "../../module/front/module/module-ir";
import type { BoundLambda, PNode } from "../../types";

export interface LambdaSource {
	readonly bound: BoundLambda;
	readonly ir: FunctionIR;
}

export type LambdaSources = readonly (readonly Readonly<Record<string, LambdaSource>>[])[];

export function lambdaSources(nodes: readonly PNode[]): LambdaSources {
	const read = new Map<string, FunctionIR>();
	const irOf = (bound: BoundLambda): FunctionIR => {
		let ir = read.get(bound.fn);
		if (ir === undefined) {
			ir = boundLambdaIR(bound);
			read.set(bound.fn, ir);
		}
		return ir;
	};
	return nodes.map((node) =>
		node.lanes.map((srcs) => {
			const lambdas: Record<string, LambdaSource> = {};
			for (const [port, src] of Object.entries(srcs))
				if (src.k === "l") lambdas[port] = { bound: src.lambda, ir: irOf(src.lambda) };
			return lambdas;
		}),
	);
}
