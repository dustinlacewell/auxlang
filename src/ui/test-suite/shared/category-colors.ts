/**
 * Generate pastel rainbow colors for categories.
 * Pure function - no dependencies on specific test data.
 */

/** HSL to CSS hsl() string */
function hsl(h: number, s: number, l: number): string {
	return `hsl(${h}, ${s}%, ${l}%)`;
}

/** Generate N evenly-spaced colors across the rainbow */
function generateRainbowColors(n: number): string[] {
	const colors: string[] = [];
	for (let i = 0; i < n; i++) {
		const hue = (i / n) * 360;
		// Moderate saturation, darker lightness for better white text contrast
		colors.push(hsl(hue, 55, 45));
	}
	return colors;
}

/** Create a color map for a list of categories */
export function generateCategoryColorMap(categories: string[]): Map<string, string> {
	const colors = generateRainbowColors(categories.length);
	return new Map(categories.map((cat, i) => [cat, colors[i]!]));
}

/** Default fallback color */
export const DEFAULT_COLOR = "hsl(0, 0%, 60%)";

/** Get color from map with fallback */
export function getColor(colorMap: Map<string, string>, key: string): string {
	return colorMap.get(key) ?? DEFAULT_COLOR;
}
