/**
 * Generate pastel rainbow colors for categories.
 */

import { getCategories, getDevicesByCategory } from "./test-data";

/** HSL to CSS hsl() string */
function hsl(h: number, s: number, l: number): string {
	return `hsl(${h}, ${s}%, ${l}%)`;
}

/** Generate N evenly-spaced pastel colors across the rainbow */
function generatePastelColors(n: number): string[] {
	const colors: string[] = [];
	for (let i = 0; i < n; i++) {
		// Spread hues evenly across 0-360
		const hue = (i / n) * 360;
		// Pastel: moderate saturation, high lightness
		colors.push(hsl(hue, 60, 65));
	}
	return colors;
}

// Pre-compute category colors
const categories = getCategories();
const colors = generatePastelColors(categories.length);

/** Map of category name to its assigned color */
export const categoryColors: Map<string, string> = new Map(
	categories.map((cat, i) => [cat, colors[i]!]),
);

/** Get color for a category */
export function getCategoryColor(category: string): string {
	return categoryColors.get(category) ?? "hsl(0, 0%, 60%)";
}

/** Get category for a device (looks up which category contains it) */
const deviceToCategory: Map<string, string> = new Map();
const devicesByCategory = getDevicesByCategory();
for (const [category, devices] of devicesByCategory) {
	for (const device of devices) {
		deviceToCategory.set(device, category);
	}
}

/** Get color for a device (same as its category) */
export function getDeviceColor(device: string): string {
	const category = deviceToCategory.get(device);
	return category ? getCategoryColor(category) : "hsl(0, 0%, 60%)";
}
