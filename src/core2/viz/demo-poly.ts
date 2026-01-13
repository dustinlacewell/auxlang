/**
 * Demo: poly expansion visualization.
 */

import * as api from "../api";
import { evalToStages } from "../eval/pipeline";
import { graphToDot } from "./graph-to-dot";
import { renderSvg } from "./render-svg";
import * as fs from "node:fs";

const code = `
// 3-voice poly saw with different filter cutoffs
saw([440, 550, 660]).lpf([800, 1200, 1600]).gain(0.3).out()
`;

async function main() {
	console.log("=== Code ===");
	console.log(code);

	const { graph, expanded, runtime } = evalToStages(code, api);

	console.log("\n=== FlatGraph (raw) ===");
	console.log(`${graph.nodes.length} nodes`);
	console.log(JSON.stringify(graph, null, 2));

	console.log("\n=== StereoGraph (expanded) ===");
	console.log(`${expanded.nodes.length} nodes`);
	console.log(`Left outputs: ${expanded.leftOutputIds.join(", ")}`);
	console.log(`Right outputs: ${expanded.rightOutputIds.join(", ")}`);
	console.log(JSON.stringify(expanded, null, 2));

	// Generate SVGs
	const dot1 = graphToDot(graph, "Before expansion (3 nodes)");
	const svg1 = await renderSvg(dot1);
	fs.writeFileSync("core2-poly-before.svg", svg1);
	console.log("\nWrote core2-poly-before.svg");

	// Convert StereoGraph to FlatGraph for visualization
	const expandedAsFlatGraph = {
		nodes: expanded.nodes,
		output: [...expanded.leftOutputIds, ...expanded.rightOutputIds],
		outputGroups: [expanded.leftOutputIds, expanded.rightOutputIds],
	};
	const dot2 = graphToDot(expandedAsFlatGraph, "After expansion (9 nodes)");
	const svg2 = await renderSvg(dot2);
	fs.writeFileSync("core2-poly-after.svg", svg2);
	console.log("Wrote core2-poly-after.svg");
}

main().catch(console.error);
