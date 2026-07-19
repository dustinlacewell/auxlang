/**
 * The compiled signal graph of a patch, rendered inline and interactive:
 * evalPatch → DOT → viz.js SVG. Same DOT source as the editor's graph panel,
 * so the picture and the audio can never disagree. Viz loads on demand
 * (dynamic import) so pages only pay for it once a graph is actually shown.
 *
 * Hover: program-to-dot stamps aux-node-N / aux-edge-F-T ids into the SVG;
 * mousemove delegation on the container maps the hovered element back to the
 * compiled Program — an edge shows its port-level connections with units
 * (EdgeTooltip), a node shows the module's card (ModuleCard). Popups render
 * through a portal to document.body so nothing clips them.
 */

import type { Program } from "@/core3/api";
import { hasModule } from "@/core3/module/define";
import { programToDot } from "@/core3/viz/program-to-dot";
import { evalPatch } from "@/ui/core3-playground/eval-patch";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { EdgeTooltip } from "./edge-tooltip";
import { ModuleCard } from "./module-card";

/**
 * The color convention lives in the DOT itself (program-to-dot emits category
 * fills and unit-colored edges inline), so this CSS only layers interaction on
 * top: hover highlights, and the feedback-red override (dashed + #f87171 beats
 * any unit color, even hovered — feedback is structure, not signal). `.aux-hit`
 * are the invisible fat hover-target clones of edge paths and must stay
 * unstyled.
 */
const THEME = `
.aux-patch-graph text { pointer-events: none; }
.aux-patch-graph .node:hover path,
.aux-patch-graph .node:hover polygon { stroke: #e5e7eb; }
.aux-patch-graph .edge:hover path:not(.aux-hit) { stroke: #e5e7eb; }
.aux-patch-graph .edge:hover polygon { fill: #e5e7eb; stroke: #e5e7eb; }
.aux-patch-graph .edge.edge-feedback path:not(.aux-hit) { stroke: #f87171; }
.aux-patch-graph .edge.edge-feedback polygon { fill: #f87171; stroke: #f87171; }
`;

type Hover = { kind: "node"; module: string } | { kind: "edge"; from: number; to: number };

/** Map the hovered SVG element to graph identity via the aux- ids in the DOT. */
function hoverFromTarget(target: EventTarget | null, program: Program): Hover | null {
	if (!(target instanceof Element)) return null;
	const g = target.closest("g[id^='aux-']");
	if (!g) return null;
	const node = g.id.match(/^aux-node-(\d+)$/);
	if (node) {
		const spec = program.nodes[Number(node[1])];
		return spec ? { kind: "node", module: spec.module } : null;
	}
	const edge = g.id.match(/^aux-edge-(\d+)-(\d+)$/);
	if (edge) return { kind: "edge", from: Number(edge[1]), to: Number(edge[2]) };
	return null;
}

/** Edge strokes are 1px — clone each line into an invisible fat hit target. */
function widenEdgeHitAreas(host: HTMLElement): void {
	for (const g of Array.from(host.querySelectorAll<SVGGElement>("g.edge"))) {
		for (const path of Array.from(g.querySelectorAll("path"))) {
			if (path.classList.contains("aux-hit")) continue;
			const hit = path.cloneNode(false) as SVGPathElement;
			hit.setAttribute("class", "aux-hit");
			hit.setAttribute("fill", "none");
			hit.setAttribute("stroke", "transparent");
			hit.setAttribute("stroke-width", "18");
			hit.style.pointerEvents = "stroke";
			g.appendChild(hit);
		}
	}
}

export function PatchGraph({ code }: { code: string }) {
	const hostRef = useRef<HTMLDivElement>(null);
	const [svg, setSvg] = useState<string | null>(null);
	const [program, setProgram] = useState<Program | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [hover, setHover] = useState<Hover | null>(null);
	const [pos, setPos] = useState({ x: 0, y: 0 });

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const compiled = evalPatch(code);
				const dot = programToDot(compiled);
				const { instance } = await import("@viz-js/viz");
				const viz = await instance();
				const rendered = viz
					.renderString(dot, { format: "svg" })
					.replace("<svg ", '<svg class="aux-patch-graph" style="max-width:100%;height:auto" ')
					// No native tooltips: graphviz <title>s carry raw indices.
					.replace(/<title>[\s\S]*?<\/title>/g, "");
				if (!cancelled) {
					setProgram(compiled);
					setSvg(rendered);
					setError(null);
				}
			} catch (err) {
				if (!cancelled) {
					setError(err instanceof Error ? err.message : String(err));
					setSvg(null);
					setProgram(null);
				}
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [code]);

	useEffect(() => {
		if (hostRef.current && svg) widenEdgeHitAreas(hostRef.current);
	}, [svg]);

	if (error) return <div className="text-accent-red text-xs font-mono px-3 py-2">{error}</div>;
	if (!svg) return <div className="text-gray-500 text-xs px-3 py-2">rendering…</div>;

	const below = pos.y < window.innerHeight / 2;
	// Patch-defined (defmod) modules have no registry card — skip the popup
	// rather than crash the lookup (deliberate v1 limitation).
	const showPopup = hover !== null && (hover.kind !== "node" || hasModule(hover.module));

	return (
		<div
			ref={hostRef}
			className="px-3 py-2 flex justify-center bg-graph-bg"
			onMouseMove={(e) => {
				setPos({ x: e.clientX, y: e.clientY });
				setHover(program ? hoverFromTarget(e.target, program) : null);
			}}
			onMouseLeave={() => setHover(null)}
		>
			<style>{THEME}</style>
			<div
				// biome-ignore lint: we control the SVG source
				dangerouslySetInnerHTML={{ __html: svg }}
			/>
			{hover &&
				program &&
				showPopup &&
				createPortal(
					<div
						className="fixed z-50 pointer-events-none"
						style={{
							left: Math.min(pos.x + 12, window.innerWidth - 320),
							top: pos.y,
							transform: below ? "translateY(14px)" : "translateY(calc(-100% - 14px))",
						}}
					>
						{hover.kind === "node" ? (
							<div className="w-72 shadow-lg">
								<ModuleCard name={hover.module} />
							</div>
						) : (
							<EdgeTooltip program={program} from={hover.from} to={hover.to} />
						)}
					</div>,
					document.body,
				)}
		</div>
	);
}
