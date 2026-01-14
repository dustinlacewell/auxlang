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
	// Round to avoid long decimals
	if (typeof v === "number" && !Number.isInteger(v)) {
		return v.toFixed(2);
	}
	return String(v);
}

function escapeLabel(s: string): string {
	return s.replace(/"/g, '\\"');
}

function isOutputRef(value: unknown): value is OutputRef {
	return typeof value === "object" && value !== null && "ref" in value && "out" in value;
}

/**
 * Find all nodes that are reachable from the given output nodes by traversing backwards.
 */
function findReachableNodes(graph: FlatGraph | StereoGraph, outputIds: NodeId[]): Set<NodeId> {
	const reachable = new Set<NodeId>(outputIds);
	const queue = [...outputIds];

	while (queue.length > 0) {
		const currentId = queue.shift()!;
		const currentNode = graph.nodes.find((n) => n.id === currentId);
		if (!currentNode) continue;

		// Check all inputs for OutputRefs
		for (const input of Object.values(currentNode.inputs)) {
			if (isOutputRef(input)) {
				if (!reachable.has(input.ref)) {
					reachable.add(input.ref);
					queue.push(input.ref);
				}
			} else if (Array.isArray(input) && isOutputRef(input[0])) {
				// Array of output refs (poly connections)
				for (const ref of input as OutputRef[]) {
					if (!reachable.has(ref.ref)) {
						reachable.add(ref.ref);
						queue.push(ref.ref);
					}
				}
			}
		}
	}

	return reachable;
}

// Heuristic: "input" is the most common default input name
function getDefaultInput(node: Node): string {
	if ("input" in node.inputs) return "input";
	if ("freq" in node.inputs) return "freq";
	if ("rate" in node.inputs) return "rate";
	return Object.keys(node.inputs)[0] ?? "";
}

export function graphToDot(graph: FlatGraph, title?: string): string {
	const lines: string[] = [];
	lines.push("digraph {");
	lines.push("  rankdir=LR");
	lines.push("  bgcolor=transparent");
	// Use reasonable margins to prevent text overflow
	lines.push('  node [shape=box, style="rounded,filled", fontname="system-ui, sans-serif", fontsize=11, margin="0.2,0.1"]');
	lines.push('  edge [fontname="system-ui, sans-serif", fontsize=9]');

	if (title) {
		lines.push("  labelloc=t");
		lines.push(`  label="${escapeLabel(title)}"`);
		lines.push('  fontname="system-ui, sans-serif"');
	}

	lines.push("");

	// Out nodes are the outputs
	const outputIds = graph.nodes.filter((n) => n.device === "out").map((n) => n.id);

	// Find all nodes reachable from outputs
	const reachableNodes = findReachableNodes(graph, outputIds);

	// Create nodes with labels
	for (const node of graph.nodes) {
		const args: string[] = [];
		for (const [_name, input] of Object.entries(node.inputs)) {
			if (typeof input === "number") {
				args.push(formatValue(input));
			} else if (Array.isArray(input) && typeof input[0] === "number") {
				args.push(formatValue(input as number[]));
			}
		}

		const label = args.length > 0 ? `${node.device}(${args.join(", ")})` : node.device;

		const isOutput = outputIds.includes(node.id);
		const isOrphaned = !reachableNodes.has(node.id);
		// Add CSS classes: device-{name} for coloring, node-output/node-device for role, node-orphaned for unreachable
		const roleClass = isOutput ? "node-output" : "node-device";
		const orphanClass = isOrphaned ? " node-orphaned" : "";
		const classes = `device-${node.device} ${roleClass}${orphanClass}`;
		const style = isOutput ? ', penwidth=2' : "";
		lines.push(`  "${node.id}" [label="${escapeLabel(label)}", class="${classes}"${style}]`);
	}

	lines.push("");

	// Create edges
	for (const node of graph.nodes) {
		const spec = getDefaultInput(node);
		const isOrphaned = !reachableNodes.has(node.id);

		for (const [inputName, input] of Object.entries(node.inputs)) {
			if (isOutputRef(input)) {
				const isDefaultInput = inputName === spec;
				const orphanClass = isOrphaned ? " edge-orphaned" : "";
				if (isDefaultInput) {
					// Default input: solid line, no label
					lines.push(`  "${input.ref}" -> "${node.id}" [class="edge-default${orphanClass}"]`);
				} else {
					// Non-default input: dashed line with label
					lines.push(`  "${input.ref}" -> "${node.id}" [label="${inputName}", style=dashed, class="edge-param${orphanClass}"]`);
				}
			} else if (Array.isArray(input) && isOutputRef(input[0])) {
				// Array of output refs (poly connections)
				const orphanClass = isOrphaned ? " edge-orphaned" : "";
				for (const ref of input as OutputRef[]) {
					lines.push(`  "${ref.ref}" -> "${node.id}" [style=dotted, class="edge-poly${orphanClass}"]`);
				}
			}
		}
	}

	lines.push("}");
	return lines.join("\n");
}

/**
 * Convert a StereoGraph to DOT format with L/R output annotations.
 */
export function stereoGraphToDot(graph: StereoGraph, title?: string): string {
	const lines: string[] = [];
	lines.push("digraph {");
	lines.push("  rankdir=LR");
	lines.push("  bgcolor=transparent");
	lines.push('  node [shape=box, style="rounded,filled", fontname="system-ui, sans-serif", fontsize=11, margin="0.2,0.1"]');
	lines.push('  edge [fontname="system-ui, sans-serif", fontsize=9]');

	if (title) {
		lines.push("  labelloc=t");
		lines.push(`  label="${escapeLabel(title)}"`);
		lines.push('  fontname="system-ui, sans-serif"');
	}

	lines.push("");

	const leftSet = new Set<NodeId>(graph.leftOutputIds);
	const rightSet = new Set<NodeId>(graph.rightOutputIds);

	// Find all nodes reachable from outputs (union of left and right)
	const allOutputIds = [...new Set([...graph.leftOutputIds, ...graph.rightOutputIds])];
	const reachableNodes = findReachableNodes(graph, allOutputIds);

	// Create nodes with labels
	for (const node of graph.nodes) {
		const args: string[] = [];
		for (const [_name, input] of Object.entries(node.inputs)) {
			if (typeof input === "number") {
				args.push(formatValue(input));
			} else if (Array.isArray(input) && typeof input[0] === "number") {
				args.push(formatValue(input as number[]));
			}
		}

		const label = args.length > 0 ? `${node.device}(${args.join(", ")})` : node.device;

		// Annotate L/R outputs
		const isLeft = leftSet.has(node.id);
		const isRight = rightSet.has(node.id);
		const isOrphaned = !reachableNodes.has(node.id);
		let roleClass = "node-device";
		let finalLabel = label;
		let style = "";

		if (isLeft && isRight) {
			roleClass = "node-output-stereo";
			finalLabel = `${label}\\n[L+R]`;
			style = ", penwidth=2";
		} else if (isLeft) {
			roleClass = "node-output-left";
			finalLabel = `${label}\\n[L]`;
			style = ", penwidth=2";
		} else if (isRight) {
			roleClass = "node-output-right";
			finalLabel = `${label}\\n[R]`;
			style = ", penwidth=2";
		}

		// Add CSS classes: device-{name} for coloring, role class for output annotations, node-orphaned for unreachable
		const orphanClass = isOrphaned ? " node-orphaned" : "";
		const classes = `device-${node.device} ${roleClass}${orphanClass}`;
		lines.push(`  "${node.id}" [label="${escapeLabel(finalLabel)}", class="${classes}"${style}]`);
	}

	lines.push("");

	// Create edges
	for (const node of graph.nodes) {
		const spec = getDefaultInput(node);
		const isOrphaned = !reachableNodes.has(node.id);

		for (const [inputName, input] of Object.entries(node.inputs)) {
			if (isOutputRef(input)) {
				const isDefaultInput = inputName === spec;
				const orphanClass = isOrphaned ? " edge-orphaned" : "";
				if (isDefaultInput) {
					lines.push(`  "${input.ref}" -> "${node.id}" [class="edge-default${orphanClass}"]`);
				} else {
					lines.push(`  "${input.ref}" -> "${node.id}" [label="${inputName}", style=dashed, class="edge-param${orphanClass}"]`);
				}
			} else if (Array.isArray(input) && isOutputRef(input[0])) {
				const orphanClass = isOrphaned ? " edge-orphaned" : "";
				for (const ref of input as OutputRef[]) {
					lines.push(`  "${ref.ref}" -> "${node.id}" [style=dotted, class="edge-poly${orphanClass}"]`);
				}
			}
		}
	}

	lines.push("}");
	return lines.join("\n");
}
