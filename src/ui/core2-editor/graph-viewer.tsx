/**
 * Component that renders a DOT graph to SVG using viz.js.
 */

import { useEffect, useState } from "react";

interface GraphViewerProps {
	dot: string | null;
	className?: string;
}

export function GraphViewer({ dot, className = "" }: GraphViewerProps) {
	const [svg, setSvg] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!dot) {
			setSvg(null);
			return;
		}

		let cancelled = false;

		async function render() {
			try {
				const { instance } = await import("@viz-js/viz");
				const viz = await instance();
				const result = viz.renderString(dot, { format: "svg" });
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

	if (error) {
		return <div className={`text-red-400 p-4 ${className}`}>Error rendering graph: {error}</div>;
	}

	if (!svg) {
		return <div className={`text-surface-400 p-4 ${className}`}>No graph to display</div>;
	}

	return (
		<div
			className={`overflow-auto bg-surface-900 p-4 rounded ${className}`}
			// biome-ignore lint: we control the SVG source
			dangerouslySetInnerHTML={{ __html: svg }}
		/>
	);
}
