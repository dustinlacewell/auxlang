/**
 * Convert a FlatGraph to Graphviz DOT format.
 */

import type { StereoGraph } from "../graph/expand-poly";
import type { FlatGraph } from "../graph/flat-graph";
import type { Node, NodeId } from "../graph/node";
import type { OutputRef } from "../graph/output-ref";

function formatValue(v: number | number[]): string {
	if (Array.isArray(v)) {
		return `[${v.join(", ")}]`;
	}
	return String(v);
}

function escapeLabel(s: string): string {
	return s.replace(/"/g, '\\"');
}

function isOutputRef(value: unknown): value is OutputRef {
	return typeof value === "object" && value !== null && "ref" in value && "out" in value;
}

export function graphToDot(graph: FlatGraph, title?: string): string {
	const lines: string[] = [];
	lines.push("digraph {");
	lines.push("  rankdir=LR");
	lines.push('  node [shape=box, style=rounded, fontname="monospace"]');
	lines.push('  edge [fontname="monospace", fontsize=10]');

	if (title) {
		lines.push(`  labelloc=t`);
		lines.push(`  label="${escapeLabel(title)}"`);
	}

	lines.push("");

	// Out nodes are the outputs
	const outputIds = graph.nodes.filter((n) => n.device === "out").map((n) => n.id);

	// Create nodes with labels
	for (const node of graph.nodes) {
		const args: string[] = [];
		for (const [name, input] of Object.entries(node.inputs)) {
			if (typeof input === "number") {
				args.push(formatValue(input));
			} else if (Array.isArray(input) && typeof input[0] === "number") {
				args.push(formatValue(input as number[]));
			}
		}

		const label = args.length > 0 ? `${node.device}(${args.join(", ")})` : `${node.device}()`;

		const isOutput = outputIds.includes(node.id);
		const style = isOutput ? ', style="rounded,bold", penwidth=2' : "";
		lines.push(`  "${node.id}" [label="${escapeLabel(label)}"${style}]`);
	}

	lines.push("");

	// Create edges
	for (const node of graph.nodes) {
		const spec = getDefaultInput(node);

		for (const [inputName, input] of Object.entries(node.inputs)) {
			if (isOutputRef(input)) {
				const isDefaultInput = inputName === spec;
				if (isDefaultInput) {
					// Default input: solid line, no label
					lines.push(`  "${input.ref}" -> "${node.id}"`);
				} else {
					// Non-default input: dashed line with label
					lines.push(`  "${input.ref}" -> "${node.id}" [label="${inputName}", style=dashed, color=gray40]`);
				}
			} else if (Array.isArray(input) && isOutputRef(input[0])) {
				// Array of output refs (poly connections)
				for (const ref of input as OutputRef[]) {
					lines.push(`  "${ref.ref}" -> "${node.id}" [style=dotted, color=blue]`);
				}
			}
		}
	}

	lines.push("}");
	return lines.join("\n");
}

// Heuristic: "input" is the most common default input name
function getDefaultInput(node: Node): string {
	if ("input" in node.inputs) return "input";
	if ("freq" in node.inputs) return "freq";
	if ("rate" in node.inputs) return "rate";
	return Object.keys(node.inputs)[0] ?? "";
}

/**
 * Convert a StereoGraph to DOT format with L/R output annotations.
 */
export function stereoGraphToDot(graph: StereoGraph, title?: string): string {
	const lines: string[] = [];
	lines.push("digraph {");
	lines.push("  rankdir=LR");
	lines.push('  node [shape=box, style=rounded, fontname="monospace"]');
	lines.push('  edge [fontname="monospace", fontsize=10]');

	if (title) {
		lines.push("  labelloc=t");
		lines.push(`  label="${escapeLabel(title)}"`);
	}

	lines.push("");

	const leftSet = new Set<NodeId>(graph.leftOutputIds);
	const rightSet = new Set<NodeId>(graph.rightOutputIds);

	// Create nodes with labels
	for (const node of graph.nodes) {
		const args: string[] = [];
		for (const [name, input] of Object.entries(node.inputs)) {
			if (typeof input === "number") {
				args.push(formatValue(input));
			} else if (Array.isArray(input) && typeof input[0] === "number") {
				args.push(formatValue(input as number[]));
			}
		}

		const label = args.length > 0 ? `${node.device}(${args.join(", ")})` : `${node.device}()`;

		// Annotate L/R outputs
		const isLeft = leftSet.has(node.id);
		const isRight = rightSet.has(node.id);
		let style = "";
		let finalLabel = label;

		if (isLeft && isRight) {
			style = ', style="rounded,bold", penwidth=2, color=purple';
			finalLabel = `${label}\\n[L+R]`;
		} else if (isLeft) {
			style = ', style="rounded,bold", penwidth=2, color=blue';
			finalLabel = `${label}\\n[L]`;
		} else if (isRight) {
			style = ', style="rounded,bold", penwidth=2, color=red';
			finalLabel = `${label}\\n[R]`;
		}

		lines.push(`  "${node.id}" [label="${escapeLabel(finalLabel)}"${style}]`);
	}

	lines.push("");

	// Create edges
	for (const node of graph.nodes) {
		const spec = getDefaultInput(node);

		for (const [inputName, input] of Object.entries(node.inputs)) {
			if (isOutputRef(input)) {
				const isDefaultInput = inputName === spec;
				if (isDefaultInput) {
					lines.push(`  "${input.ref}" -> "${node.id}"`);
				} else {
					lines.push(`  "${input.ref}" -> "${node.id}" [label="${inputName}", style=dashed, color=gray40]`);
				}
			} else if (Array.isArray(input) && isOutputRef(input[0])) {
				for (const ref of input as OutputRef[]) {
					lines.push(`  "${ref.ref}" -> "${node.id}" [style=dotted, color=blue]`);
				}
			}
		}
	}

	lines.push("}");
	return lines.join("\n");
}
