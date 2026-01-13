/**
 * Demo: evaluate code and visualize the graph at each pipeline stage.
 */

import * as api from "../api";
import { evalToStages } from "../eval/pipeline";
import { graphToDot } from "./graph-to-dot";
import { renderSvg } from "./render-svg";
import * as fs from "node:fs";

const code = `
// LFO modulating filter cutoff
const mod = lfo(2).scale({ min: 200, max: 2000 })
saw(440).lpf({ cutoff: mod }).gain(0.5).out()
`;

async function main() {
	console.log("=== Code ===");
	console.log(code);

	const { graph, expanded, runtime } = evalToStages(code, api);

	console.log("\n=== FlatGraph (raw) ===");
	console.log(JSON.stringify(graph, null, 2));

	console.log("\n=== StereoGraph (expanded) ===");
	console.log(JSON.stringify(expanded, null, 2));

	console.log("\n=== StereoRuntimeGraph ===");
	console.log(`${runtime.nodes.length} nodes`);
	console.log(`Left outputs: ${runtime.leftOutputIds.join(", ")}`);
	console.log(`Right outputs: ${runtime.rightOutputIds.join(", ")}`);

	// Generate DOT and SVG for raw graph
	const dot1 = graphToDot(graph, "FlatGraph (raw)");
	console.log("\n=== DOT (raw) ===");
	console.log(dot1);

	const svg1 = await renderSvg(dot1);
	fs.writeFileSync("core2-graph-raw.svg", svg1);
	console.log("\nWrote core2-graph-raw.svg");

	// Generate DOT and SVG for expanded graph (use nodes + combined outputs)
	const expandedAsFlatGraph = {
		nodes: expanded.nodes,
		output: [...expanded.leftOutputIds, ...expanded.rightOutputIds],
		outputGroups: [expanded.leftOutputIds, expanded.rightOutputIds],
	};
	const dot2 = graphToDot(expandedAsFlatGraph, "StereoGraph (expanded)");
	const svg2 = await renderSvg(dot2);
	fs.writeFileSync("core2-graph-expanded.svg", svg2);
	console.log("Wrote core2-graph-expanded.svg");
}

main().catch(console.error);
