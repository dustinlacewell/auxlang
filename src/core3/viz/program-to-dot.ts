/**
 * Render a compiled core3 Program as Graphviz DOT. Nodes are modules labeled
 * `module (width)`; edges are the connections in each node's per-lane PortSrc
 * table. `z` edges (the one-sample cycle cut a `loop` inserts) are drawn dashed
 * and red — the visible mark of feedback.
 */

import type { PortSrc, Program } from "../types";

/** Every distinct source node feeding a target, tagged by whether it is a z-edge. */
interface Edge {
	readonly from: number;
	readonly to: number;
	readonly feedback: boolean;
}

function edgesInto(node: Program["nodes"][number], to: number): Edge[] {
	const seen = new Map<string, Edge>();
	for (const lane of node.lanes) {
		for (const src of Object.values(lane) as PortSrc[]) {
			if (src.k !== "n" && src.k !== "z") continue;
			const key = `${src.node}:${src.k}`;
			if (!seen.has(key)) seen.set(key, { from: src.node, to, feedback: src.k === "z" });
		}
	}
	return [...seen.values()];
}

function label(node: Program["nodes"][number]): string {
	return `${node.module} (${node.width})`;
}

function edgeLine(e: Edge): string {
	const style = e.feedback ? ' [style=dashed, color="#f87171", class="edge-feedback"]' : "";
	return `  "${e.from}" -> "${e.to}"${style}`;
}

export function programToDot(program: Program): string {
	const outs = new Set(program.outs);
	const lines: string[] = [
		"digraph {",
		"  rankdir=LR",
		"  bgcolor=transparent",
		'  node [shape=box, style="rounded,filled", fontname="system-ui, sans-serif", fontsize=11, margin="0.2,0.1"]',
		'  edge [fontname="system-ui, sans-serif", fontsize=9]',
		"",
	];

	program.nodes.forEach((node, i) => {
		const role = outs.has(i) ? ", penwidth=2" : "";
		const cls = outs.has(i) ? "node-output" : "node-device";
		lines.push(`  "${i}" [label="${label(node)}", class="${cls}"${role}]`);
	});

	lines.push("");

	program.nodes.forEach((node, i) => {
		for (const edge of edgesInto(node, i)) lines.push(edgeLine(edge));
	});

	lines.push("}");
	return lines.join("\n");
}
