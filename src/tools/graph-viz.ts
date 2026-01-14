/**
 * Output DOT format for graphviz visualization.
 *
 * Usage:
 *   npx tsx src/tools/graph-viz.ts "saw(440).lpf(800).out()"
 *   npx tsx src/tools/graph-viz.ts --file path/to/script.js
 *   npx tsx src/tools/graph-viz.ts "seq('{c4,e4}').saw().out()" --compiled
 *   npx tsx src/tools/graph-viz.ts "clock(120).seq('c4').saw().out()" | dot -Tpng > graph.png
 */

import { reset } from "@/core2/eval/reset";
import * as api from "@/core2/api";
import { getBuilder } from "@/core2/graph/graph-builder";
import { expandPoly } from "@/core2/graph/expand-poly";
import type { Node } from "@/core2/graph/node";
import * as fs from "fs";

function escapeLabel(s: string): string {
	return s.replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

function nodeColor(device: string): string {
	if (device === "out") return "#98fb98"; // pale green
	if (device === "seq" || device === "clock") return "#87ceeb"; // sky blue
	if (device.includes("osc") || device === "saw" || device === "sin" || device === "tri" || device === "sqr" || device === "noise")
		return "#ffa07a"; // light salmon
	if (device === "lpf" || device === "hpf" || device === "bpf" || device === "notch")
		return "#dda0dd"; // plum
	if (device === "adsr" || device === "ad" || device === "ar")
		return "#f0e68c"; // khaki
	if (device === "delay" || device === "reverb" || device === "tape")
		return "#b0c4de"; // light steel blue
	if (device === "gain" || device === "mix" || device === "pan" || device === "spread")
		return "#d3d3d3"; // light gray
	return "#ffffff"; // white
}

function generateDot(nodes: Node[], title: string): string {
	const lines: string[] = [];
	lines.push("digraph G {");
	lines.push('  rankdir=LR;');
	lines.push('  node [shape=box, style=filled, fontname="Courier"];');
	lines.push(`  label="${escapeLabel(title)}";`);
	lines.push('  labelloc=t;');
	lines.push("");

	// Define nodes
	for (const node of nodes) {
		const color = nodeColor(node.device);
		const label = `${node.id}\\n[${node.device}]`;
		lines.push(`  "${node.id}" [label="${label}", fillcolor="${color}"];`);
	}

	lines.push("");

	// Define edges
	for (const node of nodes) {
		for (const [inputName, value] of Object.entries(node.inputs)) {
			if (value === undefined || value === null) continue;

			if (typeof value === "object" && "ref" in value && "out" in value) {
				const ref = value as { ref: string; out: string };
				lines.push(`  "${ref.ref}" -> "${node.id}" [label="${inputName}"];`);
			} else if (Array.isArray(value)) {
				for (const v of value) {
					if (typeof v === "object" && v && "ref" in v && "out" in v) {
						const r = v as { ref: string; out: string };
						lines.push(`  "${r.ref}" -> "${node.id}" [label="${inputName}"];`);
					}
				}
			}
		}
	}

	lines.push("}");
	return lines.join("\n");
}

function runScript(code: string, compiled: boolean): Node[] {
	reset();
	const fn = new Function(...Object.keys(api), code);
	fn(...Object.values(api));
	const flat = getBuilder().build();

	if (compiled) {
		const stereo = expandPoly(flat);
		return [...stereo.nodes];
	}

	return [...flat.nodes];
}

// CLI
const args = process.argv.slice(2);
const fileIndex = args.indexOf("--file");
const compiled = args.includes("--compiled");

let code: string;

if (fileIndex !== -1 && args[fileIndex + 1]) {
	const filePath = args[fileIndex + 1]!;
	code = fs.readFileSync(filePath, "utf-8");
} else {
	code = args.find((a) => !a.startsWith("--") && !args[args.indexOf(a) - 1]?.startsWith("--file"))
		|| "saw(440).lpf(800).out()";
}

try {
	const nodes = runScript(code, compiled);
	const title = compiled ? "Compiled Graph" : "Flat Graph";
	const dot = generateDot(nodes, title);
	console.log(dot);
} catch (err) {
	console.error(`Error: ${err}`);
	process.exit(1);
}
