/**
 * Evaluation pipeline - from code string to various output formats.
 *
 * Provides access to intermediate stages for visualization/debugging:
 * - FlatGraph: raw graph from API execution
 * - StereoGraph: after poly expansion with L/R distribution
 * - StereoRuntimeGraphs: ready for worklet
 */

import type { FlatGraph } from "../graph/flat-graph";
import { expandPoly, type StereoGraph } from "../graph/expand-poly";
import { compile, type StereoRuntimeGraph } from "../runtime/compile";
import { reset } from "./reset";
import { runCode } from "./run-code";
import { collect } from "./collect";

/**
 * Result of evaluation with access to all pipeline stages.
 */
export interface EvalResult {
	/** Raw graph from API execution (arrays unexpanded) */
	graph: FlatGraph;
	/** Graph after poly expansion with L/R output distribution */
	expanded: StereoGraph;
	/** Compiled stereo runtime graph */
	runtime: StereoRuntimeGraph;
}

/**
 * Evaluate code and return all pipeline stages.
 * Useful for debugging and visualization.
 */
export function evalToStages(code: string, api: Record<string, unknown>): EvalResult {
	reset();
	runCode(code, api);

	const graph = collect();
	const expanded = expandPoly(graph);
	const runtime = compile(expanded);

	return { graph, expanded, runtime };
}

/**
 * Evaluate code and return just the FlatGraph (before expansion).
 * Useful for visualization of user intent.
 */
export function evalToGraph(code: string, api: Record<string, unknown>): FlatGraph {
	reset();
	runCode(code, api);
	return collect();
}

/**
 * Evaluate code and return the expanded StereoGraph.
 * Shows how poly arrays become separate L/R voices.
 */
export function evalToExpanded(code: string, api: Record<string, unknown>): StereoGraph {
	reset();
	runCode(code, api);
	const graph = collect();
	return expandPoly(graph);
}

/**
 * Evaluate code and return the StereoRuntimeGraph.
 * Ready to send to AudioWorklet.
 */
export function evalToRuntime(code: string, api: Record<string, unknown>): StereoRuntimeGraph {
	reset();
	runCode(code, api);
	const graph = collect();
	const expanded = expandPoly(graph);
	return compile(expanded);
}
