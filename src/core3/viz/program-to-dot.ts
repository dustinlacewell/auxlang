/**
 * Render a compiled core3 Program as Graphviz DOT. Nodes share one neutral
 * chip fill; the label carries the identity — module name in its category's
 * color (`out` in white), with (×width) only when polyphony widened the node.
 * Edges take the color of the unit flowing through them (the source output
 * port's unit —
 * when parallel port wires share one drawn arrow, the first wins and the
 * hover tooltip expands the rest). `z` edges (the one-sample cycle cut a
 * `loop` inserts) stay dashed and red — feedback is a structural mark, not a
 * signal kind, so it overrides the unit color.
 *
 * Colors are emitted inline (fillcolor/color) so every DOT consumer — the
 * docs' PatchGraph, the editor's GraphViewer, `dot -Tpng` — agrees; the
 * node-output / node-device / edge-feedback classes remain for hover CSS.
 */

import type { PortSrc, Program, Unit } from "../types";
import { edgeStrokeColor, nodeFill, nodeInkColor, outNodeInkColor } from "./dot-colors";
import { programSpec } from "./program-spec";

const FEEDBACK_COLOR = "#f87171";

/** Every distinct source node feeding a target, tagged by z-edge-ness and unit. */
interface Edge {
	readonly from: number;
	readonly to: number;
	readonly feedback: boolean;
	readonly unit: Unit | undefined;
}

function unitOfSource(program: Program, src: { node: number; port: string }): Unit | undefined {
	const fromNode = program.nodes[src.node];
	if (!fromNode) return undefined;
	return programSpec(program, fromNode.module).outs[src.port]?.unit;
}

function edgesInto(program: Program, node: Program["nodes"][number], to: number): Edge[] {
	const seen = new Map<string, Edge>();
	for (const lane of node.lanes) {
		for (const src of Object.values(lane) as PortSrc[]) {
			if (src.k !== "n" && src.k !== "z") continue;
			const key = `${src.node}:${src.k}`;
			if (!seen.has(key)) {
				seen.set(key, {
					from: src.node,
					to,
					feedback: src.k === "z",
					unit: unitOfSource(program, src),
				});
			}
		}
	}
	return [...seen.values()];
}

/** Module name; the lane width only when polyphony actually widened it. */
function label(node: Program["nodes"][number]): string {
	return node.width > 1 ? `${node.module} (×${node.width})` : node.module;
}

// Explicit SVG ids (aux-node-N / aux-edge-F-T) let hover UIs map elements back
// to Program indices without relying on graphviz's <title> names.
function edgeLine(e: Edge): string {
	const style = e.feedback
		? `, style=dashed, color="${FEEDBACK_COLOR}", class="edge-feedback"`
		: `, color="${edgeStrokeColor(e.unit)}"`;
	return `  "${e.from}" -> "${e.to}" [id="aux-edge-${e.from}-${e.to}"${style}]`;
}

export function programToDot(program: Program): string {
	const outs = new Set(program.outs);
	const lines: string[] = [
		"digraph {",
		"  rankdir=LR",
		"  bgcolor=transparent",
		`  node [shape=box, style="rounded,filled", fontname="system-ui, sans-serif", fontsize=11, margin="0.2,0.1", fillcolor="${nodeFill}", color="${nodeFill}"]`,
		'  edge [fontname="system-ui, sans-serif", fontsize=9]',
		"",
	];

	program.nodes.forEach((node, i) => {
		// One neutral chip per node, no outlines; identity is the label ink —
		// category color, or pure white for the `out` terminal.
		const ink = outs.has(i)
			? outNodeInkColor
			: nodeInkColor(programSpec(program, node.module).category);
		const cls = outs.has(i) ? "node-output" : "node-device";
		lines.push(
			`  "${i}" [id="aux-node-${i}", label="${label(node)}", class="${cls}", fontcolor="${ink}"]`,
		);
	});

	lines.push("");

	program.nodes.forEach((node, i) => {
		for (const edge of edgesInto(program, node, i)) lines.push(edgeLine(edge));
	});

	lines.push("}");
	return lines.join("\n");
}
