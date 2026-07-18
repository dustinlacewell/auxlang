/**
 * Collapsible graph panel: renders the compiled Program as a DOT graph via the
 * shared GraphViewer (viz.js). Mirrors main-editor's bordered graph frame; the
 * header toggles it open/closed.
 */

import type { Program } from "@/core3/api";
import { programToDot } from "@/core3/viz/program-to-dot";
import { GraphViewer } from "@/ui/core2-editor/graph-viewer";
import { useMemo, useState } from "react";

interface GraphPanelProps {
	program: Program | null;
}

export function GraphPanel({ program }: GraphPanelProps) {
	const [open, setOpen] = useState(false);
	const dot = useMemo(() => (program ? programToDot(program) : null), [program]);

	return (
		<div className="mt-6 border border-surface-600 rounded overflow-hidden">
			<button
				type="button"
				onClick={() => setOpen((o) => !o)}
				className="w-full flex items-center gap-2 px-4 h-10 bg-surface-700 border-b border-surface-600 text-sm text-gray-400 hover:text-white"
			>
				<span>{open ? "▾" : "▸"}</span>
				<span>graph</span>
			</button>
			{open && (
				<div className="h-80 bg-surface-900">
					<GraphViewer dot={dot} className="h-full" />
				</div>
			)}
		</div>
	);
}
