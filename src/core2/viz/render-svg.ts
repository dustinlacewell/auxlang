/**
 * Render DOT string to SVG using viz.js.
 */

export async function renderSvg(dot: string): Promise<string> {
	const { instance } = await import("@viz-js/viz");
	const viz = await instance();
	return viz.renderString(dot, { format: "svg" });
}
