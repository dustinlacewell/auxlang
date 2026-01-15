/**
 * Component that renders a DOT graph to SVG using viz.js.
 * Supports pan (drag) and zoom (mouse wheel) with double-click to fit.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { generateCategoryColorMap, getColor } from "@/ui/test-suite/shared/category-colors";
import { getCategories, getDevicesByCategory } from "@/ui/test-suite/device-tests/device-test-data";

export interface Transform {
	x: number;
	y: number;
	scale: number;
}

interface GraphViewerProps {
	dot: string | null;
	className?: string;
	transform?: Transform | undefined;
	onTransformChange?: (transform: Transform) => void;
	showOrphaned?: boolean;
	onShowOrphanedChange?: (show: boolean) => void;
}

const PT_TO_PX = 96 / 72;

/** Convert HSL string to darker fill variant */
function hslToFillAndStroke(hsl: string): { fill: string; stroke: string } {
	// Parse hsl(h, s%, l%)
	const match = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
	if (!match) {
		return { fill: "#374151", stroke: "#6b7280" };
	}
	const h = Number.parseInt(match[1]!, 10);
	const s = Number.parseInt(match[2]!, 10);
	const l = Number.parseInt(match[3]!, 10);
	// Fill: darker, less saturated
	// Stroke: original color
	return {
		fill: `hsl(${h}, ${Math.max(s - 20, 20)}%, ${Math.max(l - 35, 15)}%)`,
		stroke: hsl,
	};
}

// Base CSS theme for the graph
const baseThemeCSS = `
	.aux-graph text {
		font-family: system-ui, -apple-system, sans-serif;
		fill: #e5e7eb;
	}
	.aux-graph .graph > title + polygon {
		fill: transparent;
	}
	/* Default node styling */
	.aux-graph .node polygon,
	.aux-graph .node ellipse,
	.aux-graph .node path {
		fill: #374151;
		stroke: #6b7280;
	}
	/* Output node overlays */
	.aux-graph .node.node-output polygon,
	.aux-graph .node.node-output ellipse,
	.aux-graph .node.node-output path {
		stroke-width: 2px;
	}
	.aux-graph .node.node-output-stereo polygon,
	.aux-graph .node.node-output-stereo ellipse,
	.aux-graph .node.node-output-stereo path {
		stroke-width: 2px;
	}
	.aux-graph .node.node-output-left polygon,
	.aux-graph .node.node-output-left ellipse,
	.aux-graph .node.node-output-left path {
		stroke-width: 2px;
	}
	.aux-graph .node.node-output-right polygon,
	.aux-graph .node.node-output-right ellipse,
	.aux-graph .node.node-output-right path {
		stroke-width: 2px;
	}
	/* Edge styling */
	.aux-graph .edge path {
		stroke: #9ca3af;
	}
	.aux-graph .edge polygon {
		fill: #9ca3af;
		stroke: #9ca3af;
	}
	.aux-graph .edge.edge-default path {
		stroke: #60a5fa;
		stroke-width: 1.5px;
	}
	.aux-graph .edge.edge-default polygon {
		fill: #60a5fa;
		stroke: #60a5fa;
	}
	.aux-graph .edge.edge-param path {
		stroke: #6b7280;
	}
	.aux-graph .edge.edge-param polygon {
		fill: #6b7280;
		stroke: #6b7280;
	}
	.aux-graph .edge.edge-poly path {
		stroke: #a855f7;
	}
	.aux-graph .edge.edge-poly polygon {
		fill: #a855f7;
		stroke: #a855f7;
	}
	.aux-graph .edge text {
		fill: #9ca3af;
		font-size: 9px;
	}
	/* Orphaned nodes/edges hidden by default */
	.aux-graph .node.node-orphaned,
	.aux-graph .edge.edge-orphaned {
		display: none;
	}
	/* Show orphaned when enabled */
	.show-orphaned .aux-graph .node.node-orphaned,
	.show-orphaned .aux-graph .edge.edge-orphaned {
		display: block;
	}
	/* Dim orphaned nodes when shown */
	.show-orphaned .aux-graph .node.node-orphaned polygon,
	.show-orphaned .aux-graph .node.node-orphaned ellipse,
	.show-orphaned .aux-graph .node.node-orphaned path {
		opacity: 0.4;
	}
	.show-orphaned .aux-graph .node.node-orphaned text {
		opacity: 0.5;
	}
	.show-orphaned .aux-graph .edge.edge-orphaned path,
	.show-orphaned .aux-graph .edge.edge-orphaned polygon {
		opacity: 0.3;
	}
`;

// Build device → color lookup from device test data
function buildDeviceColorMap(): Map<string, string> {
	const categories = getCategories();
	const categoryColors = generateCategoryColorMap(categories);
	const devicesByCategory = getDevicesByCategory();
	const deviceColors = new Map<string, string>();

	for (const [category, devices] of devicesByCategory) {
		const color = getColor(categoryColors, category);
		for (const device of devices) {
			deviceColors.set(device, color);
		}
	}
	return deviceColors;
}

// Generate CSS rules for each device based on category colors
function generateDeviceCSS(): string {
	const deviceColors = buildDeviceColorMap();
	const rules: string[] = [];

	for (const [device, color] of deviceColors) {
		const { fill, stroke } = hslToFillAndStroke(color);
		rules.push(`
	.aux-graph .node.device-${device} polygon,
	.aux-graph .node.device-${device} ellipse,
	.aux-graph .node.device-${device} path {
		fill: ${fill};
		stroke: ${stroke};
	}`);
	}

	return rules.join("\n");
}

const DEFAULT_TRANSFORM: Transform = { x: 0, y: 0, scale: 1 };

export function GraphViewer({
	dot,
	className = "",
	transform: externalTransform,
	onTransformChange,
	showOrphaned: externalShowOrphaned,
	onShowOrphanedChange,
}: GraphViewerProps) {
	const [svg, setSvg] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [internalTransform, setInternalTransform] = useState<Transform>(DEFAULT_TRANSFORM);
	const [isDragging, setIsDragging] = useState(false);
	const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
	const [internalShowOrphaned, setInternalShowOrphaned] = useState(false);
	const hasFittedRef = useRef(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const svgRef = useRef<HTMLDivElement>(null);

	// Use external transform if provided, otherwise internal
	const transform = externalTransform ?? internalTransform;
	const setTransform = useCallback(
		(newTransform: Transform | ((prev: Transform) => Transform)) => {
			const resolved = typeof newTransform === "function" ? newTransform(transform) : newTransform;
			if (onTransformChange) {
				onTransformChange(resolved);
			} else {
				setInternalTransform(resolved);
			}
		},
		[transform, onTransformChange],
	);

	// Use external showOrphaned if provided, otherwise internal
	const showOrphaned = externalShowOrphaned ?? internalShowOrphaned;
	const setShowOrphaned = useCallback(
		(show: boolean) => {
			if (onShowOrphanedChange) {
				onShowOrphanedChange(show);
			} else {
				setInternalShowOrphaned(show);
			}
		},
		[onShowOrphanedChange],
	);

	// Memoize the full CSS theme
	const themeCSS = useMemo(() => baseThemeCSS + generateDeviceCSS(), []);

	// Render DOT to SVG
	useEffect(() => {
		if (!dot) {
			setSvg(null);
			hasFittedRef.current = false;
			return;
		}
		const safeDot = dot;

		// Reset fitted flag immediately when DOT changes, before rendering starts
		// This ensures the graph stays hidden until the new SVG is rendered and fitted
		hasFittedRef.current = false;

		let cancelled = false;

		async function render() {
			try {
				const { instance } = await import("@viz-js/viz");
				const viz = await instance();
				let result = viz.renderString(safeDot, { format: "svg" });
				// Add wrapper class for theming
				result = result.replace("<svg ", '<svg class="aux-graph" ');
				if (!cancelled) {
					setSvg(result);
					setError(null);
				}
			} catch (err) {
				if (!cancelled) {
					setError(String(err));
					setSvg(null);
				}
			}
		}

		render();

		return () => {
			cancelled = true;
		};
	}, [dot]);

	// Fit to view - calculate scale and position to fit SVG in container
	const fitToView = useCallback(() => {
		const container = containerRef.current;
		const svgEl = svgRef.current?.querySelector("svg");
		if (!container || !svgEl) {
			return false;
		}

		const containerRect = container.getBoundingClientRect();
		// Container must have dimensions to fit properly
		if (containerRect.width === 0 || containerRect.height === 0) {
			return false;
		}

		// Use the SVG's width/height attributes (in pt), which graphviz sets
		const widthAttr = svgEl.getAttribute("width");
		const heightAttr = svgEl.getAttribute("height");
		const boundingRect = svgEl.getBoundingClientRect();
		const parseDim = (attr: string | null, fallback: number) => {
			if (!attr) return fallback;
			const numeric = Number.parseFloat(attr);
			if (Number.isNaN(numeric)) return fallback;
			const lower = attr.trim().toLowerCase();
			// Graphviz emits pt by default; assume pt when unit is missing
			if (lower.endsWith("pt") || !/[a-z%]/.test(lower)) {
				return numeric * PT_TO_PX;
			}
			if (lower.endsWith("px")) return numeric;
			return fallback;
		};

		const svgWidth = parseDim(widthAttr, boundingRect.width);
		const svgHeight = parseDim(heightAttr, boundingRect.height);

		if (svgWidth === 0 || svgHeight === 0) {
			return false;
		}

		// Add padding
		const padding = 20;
		const availableWidth = containerRect.width - padding * 2;
		const availableHeight = containerRect.height - padding * 2;

		// Calculate scale to fit (no cap; let small graphs upscale fully)
		const scaleX = availableWidth / svgWidth;
		const scaleY = availableHeight / svgHeight;
		const scale = Math.min(scaleX, scaleY);

		setTransform({ x: 0, y: 0, scale });
		hasFittedRef.current = true;
		return true;
	}, [setTransform]);

	// Reset fitted flag when external transform is cleared
	useEffect(() => {
		if (externalTransform === undefined) {
			hasFittedRef.current = false;
		}
	}, [externalTransform]);

	// Fit to view when SVG first loads and container has dimensions
	useEffect(() => {
		if (!svg || externalTransform || hasFittedRef.current) {
			return undefined;
		}

		const container = containerRef.current;
		if (!container) return undefined;

		let observer: ResizeObserver | null = null;

		// Try fitting immediately
		const frame = requestAnimationFrame(() => {
			const success = fitToView();
			// If fit failed (container has no dimensions yet), observe for resize
			if (!success) {
				observer = new ResizeObserver(() => {
					if (fitToView()) {
						observer?.disconnect();
					}
				});
				observer.observe(container);
			}
		});

		return () => {
			cancelAnimationFrame(frame);
			observer?.disconnect();
		};
	}, [svg, externalTransform, fitToView]);

	// Handle mouse wheel zoom
	const handleWheel = useCallback(
		(e: React.WheelEvent | WheelEvent) => {
			e.preventDefault();
			e.stopPropagation();
			if ("stopImmediatePropagation" in e && typeof e.stopImmediatePropagation === "function") {
				e.stopImmediatePropagation();
			}
			const delta = e.deltaY > 0 ? 0.9 : 1.1;
			const rect = containerRef.current?.getBoundingClientRect();
			if (!rect) return;

			// Zoom towards mouse position
			const mouseX = e.clientX - rect.left - rect.width / 2;
			const mouseY = e.clientY - rect.top - rect.height / 2;

			setTransform((prev) => {
				const newScale = Math.min(Math.max(prev.scale * delta, 0.1), 5);
				const scaleChange = newScale / prev.scale;
				return {
					x: mouseX - (mouseX - prev.x) * scaleChange,
					y: mouseY - (mouseY - prev.y) * scaleChange,
					scale: newScale,
				};
			});
		},
		[setTransform],
	);

	// Ensure wheel events are cancelled even if React's passive defaults change
	useEffect(() => {
		const el = containerRef.current;
		if (!el) return undefined;
		const handler = (e: WheelEvent) => {
			handleWheel(e);
		};
		el.addEventListener("wheel", handler, { passive: false, capture: true });
		return () => el.removeEventListener("wheel", handler, { capture: true } as AddEventListenerOptions);
	}, [handleWheel]);

	// Handle drag start
	const handleMouseDown = useCallback((e: React.MouseEvent) => {
		if (e.button !== 0) return; // Only left click
		setIsDragging(true);
		setDragStart({ x: e.clientX, y: e.clientY });
	}, []);

	// Handle drag move
	const handleMouseMove = useCallback(
		(e: React.MouseEvent) => {
			if (!isDragging) return;
			const dx = e.clientX - dragStart.x;
			const dy = e.clientY - dragStart.y;
			setDragStart({ x: e.clientX, y: e.clientY });
			setTransform((prev) => ({
				...prev,
				x: prev.x + dx,
				y: prev.y + dy,
			}));
		},
		[isDragging, dragStart, setTransform],
	);

	// Handle drag end
	const handleMouseUp = useCallback(() => {
		setIsDragging(false);
	}, []);

	// Handle double click to fit
	const handleDoubleClick = useCallback(() => {
		fitToView();
	}, [fitToView]);

	if (error) {
		return <div className={`text-red-400 p-4 ${className}`}>Error rendering graph: {error}</div>;
	}

	if (!svg) {
		return <div className={`text-gray-500 p-4 text-center ${className}`}>Run code to see graph</div>;
	}

	return (
		<div
			ref={containerRef}
			className={`overflow-hidden bg-surface-900 select-none relative ${className}`}
			style={{ cursor: isDragging ? "grabbing" : "grab" }}
			onWheel={handleWheel}
			onWheelCapture={handleWheel}
			onMouseDown={handleMouseDown}
			onMouseMove={handleMouseMove}
			onMouseUp={handleMouseUp}
			onMouseLeave={handleMouseUp}
			onDoubleClick={handleDoubleClick}
		>
			<style>{themeCSS}</style>
			{/* Toggle button for orphaned nodes */}
			<button
				type="button"
				onClick={(e) => {
					e.stopPropagation();
					setShowOrphaned(!showOrphaned);
				}}
				className="absolute top-2 right-2 z-10 bg-surface-700 hover:bg-surface-600 text-gray-300 hover:text-white rounded px-2 py-1 text-xs font-medium transition-colors"
				style={{ cursor: "pointer" }}
				title={showOrphaned ? "Hide orphaned nodes" : "Show orphaned nodes"}
			>
				{showOrphaned ? "👁️" : "👁️‍🗨️"}
			</button>
			<div
				className="w-full h-full flex items-center justify-center"
				style={{
					transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
					transformOrigin: "center center",
					opacity: !externalTransform && !hasFittedRef.current ? 0 : 1,
					transition: !externalTransform && !hasFittedRef.current ? "none" : "opacity 0.15s ease-in",
				}}
			>
				<div
					ref={svgRef}
					className={showOrphaned ? "show-orphaned" : ""}
					style={{ pointerEvents: "none" }}
					// biome-ignore lint: we control the SVG source
					dangerouslySetInnerHTML={{ __html: svg }}
				/>
			</div>
		</div>
	);
}
