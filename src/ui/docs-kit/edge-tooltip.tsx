/**
 * Hover tooltip for a graph edge: one row per port-level connection, showing
 * the source output port and target input port with their unit annotations
 * from the registry (or the Program's own patch-defined specs). Feedback (z)
 * connections are tagged.
 */

import type { Program } from "@/core3/api";
import type { Unit } from "@/core3/types";
import { edgeConnections } from "@/core3/viz/edge-connections";
import { programSpec } from "@/core3/viz/program-spec";
import { PortSwatch } from "@/ui/design/port-swatch";

interface EdgeTooltipProps {
	program: Program;
	from: number;
	to: number;
}

/** `(unit)` annotation with a swatch in the unit's color; hidden for unknown ports. */
function UnitTag({ unit }: { unit: Unit | undefined }) {
	if (!unit) return null;
	return (
		<span className="text-gray-500">
			{" "}
			(
			<span className="mr-1">
				<PortSwatch unit={unit} />
			</span>
			{unit})
		</span>
	);
}

export function EdgeTooltip({ program, from, to }: EdgeTooltipProps) {
	const fromNode = program.nodes[from];
	const toNode = program.nodes[to];
	if (!fromNode || !toNode) return null;
	const fromSpec = programSpec(program, fromNode.module);
	const toSpec = programSpec(program, toNode.module);

	return (
		<div className="bg-surface-800 border border-surface-700 rounded-md px-2 py-1.5 text-xs font-mono shadow-lg whitespace-nowrap">
			{edgeConnections(program, from, to).map((c) => (
				<div key={`${c.fromPort}>${c.toPort}:${c.feedback}`} className="py-0.5">
					<span className="text-gray-200">{c.fromPort}</span>
					<UnitTag unit={fromSpec.outs[c.fromPort]?.unit} />
					<span className="text-gray-400"> → </span>
					<span className="text-gray-200">{c.toPort}</span>
					<UnitTag unit={toSpec.ins[c.toPort]?.unit} />
					{c.feedback && <span className="text-red-400"> · 1-sample feedback</span>}
				</div>
			))}
		</div>
	);
}
