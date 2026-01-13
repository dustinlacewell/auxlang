/**
 * Full pipeline debug tool - shows every stage of compilation.
 * Usage: npx tsx src/tests/scratch/debug-full-pipeline.ts "your code here"
 */

import * as api from "../../core2/api";
import { collect } from "../../core2/eval/collect";
import { reset } from "../../core2/eval/reset";
import { runCode } from "../../core2/eval/run-code";
import { expandPoly } from "../../core2/graph/expand-poly";
import { compile } from "../../core2/runtime/compile";
import { hydrateFunction } from "../../core2/runtime/hydrate-function";
import { toWorkletStereoGraph } from "../../core2/runtime/to-worklet-graph";

const code = process.argv[2] || `clock(180).seq("c4*4").apply(s =>
  sah({ input: noise(), trig: s.trig })
    .scale({ from: -1, to: 1, min: 150, max: 600 })
    .quantize({ scale: "blues" })
    .tri()
    .gain({ level: s.gate.ar() })
    .out()
)`;

async function debug() {
	console.log("=".repeat(80));
	console.log("CODE:");
	console.log(code);
	console.log("=".repeat(80));

	// Stage 1: API execution
	reset();
	runCode(code, api);
	const graph = collect();

	console.log("\n[1] API GRAPH (after runCode + collect)");
	console.log("-".repeat(40));
	for (const n of graph.nodes) {
		console.log(`${n.id}: ${n.device}`);
		console.log(`  inputs: ${JSON.stringify(n.inputs)}`);
		console.log(`  config: ${JSON.stringify(n.config)}`);
	}

	// Stage 2: Poly expansion
	const expanded = expandPoly(graph);

	console.log("\n[2] EXPANDED GRAPH (after expandPoly)");
	console.log("-".repeat(40));
	for (const n of expanded.nodes) {
		console.log(`${n.id}: ${n.device}`);
		console.log(`  inputs: ${JSON.stringify(n.inputs)}`);
		console.log(`  config: ${JSON.stringify(n.config)}`);
	}
	console.log(`Left outputs: [${expanded.leftOutputIds.join(", ")}]`);
	console.log(`Right outputs: [${expanded.rightOutputIds.join(", ")}]`);

	// Stage 3: Compile to runtime graph
	const runtime = compile(expanded);

	console.log("\n[3] RUNTIME GRAPH (after compile)");
	console.log("-".repeat(40));
	for (const n of runtime.nodes) {
		console.log(`${n.id}: ${n.device}`);
		console.log(`  inputSources: ${JSON.stringify(n.inputSources)}`);
		console.log(`  config: ${JSON.stringify(n.config)}`);
	}

	// Stage 4: Serialize for worklet
	const worklet = await toWorkletStereoGraph(runtime);

	console.log("\n[4] WORKLET GRAPH (serialized for AudioWorklet)");
	console.log("-".repeat(40));

	console.log("\nSPECS:");
	for (const [name, spec] of Object.entries(worklet.specs)) {
		console.log(`  ${name}:`);
		console.log(`    inputs: ${JSON.stringify(spec.inputs)}`);
		console.log(`    outputs: ${JSON.stringify(spec.outputs)}`);
		console.log(`    processSource (first 150 chars): ${spec.processSource.slice(0, 150)}...`);

		// Try to hydrate the process function
		try {
			hydrateFunction(spec.processSource);
			console.log(`    processSource hydration: OK`);
		} catch (e) {
			console.log(`    processSource hydration: FAILED - ${e}`);
			console.log(`    FULL processSource:\n${spec.processSource}`);
		}
	}

	console.log("\nNODES:");
	for (const n of worklet.nodes) {
		console.log(`  ${n.id}: ${n.device}`);
		console.log(`    inputs: ${JSON.stringify(n.inputs)}`);
		console.log(`    config:`);
		for (const [key, cfg] of Object.entries(n.config)) {
			if (cfg.type === "fn") {
				console.log(`      ${key}: [fn] ${cfg.source.slice(0, 80)}...`);
				// Try to hydrate
				try {
					hydrateFunction(cfg.source);
					console.log(`        hydration: OK`);
				} catch (e) {
					console.log(`        hydration: FAILED - ${e}`);
				}
			} else {
				const val = JSON.stringify(cfg.value);
				console.log(`      ${key}: [data] ${val.length > 80 ? val.slice(0, 80) + "..." : val}`);
			}
		}
	}

	console.log("\n" + "=".repeat(80));
	console.log("DONE");
}

debug().catch(console.error);
