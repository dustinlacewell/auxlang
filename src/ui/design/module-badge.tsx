/**
 * The one way to render a module category in the UI: a saturated chip showing
 * the category's name on its palette fill. No color prop exists on purpose —
 * consumers can only name the category, so every badge follows the palette in
 * src/theme/colors.ts by construction. `size` picks card-badge vs heading
 * scale; layout (margins, alignment) belongs to the call site.
 */

import type { Category } from "@/core3/types";
import { categoryColors, onCategoryText } from "@/theme/colors";

interface ModuleBadgeProps {
	category: Category;
	size?: "sm" | "md";
	/** Group headings label the set ("sources"); a lone module's badge is singular ("source"). */
	plural?: boolean;
	/** Spans the full width of its container — used for the modules-page category header chip. */
	fullWidth?: boolean;
}

const sizeStyles: Record<"sm" | "md", string> = {
	sm: "text-[10px] px-1.5 py-0.5",
	md: "text-xs px-2 py-0.5",
};

const singularLabels: Record<Category, string> = {
	timing: "timing",
	sources: "source",
	filters: "filter",
	envelopes: "envelope",
	effects: "effect",
	drums: "drum",
	bridge: "bridge",
	utils: "util",
};

export function ModuleBadge({
	category,
	size = "sm",
	plural = false,
	fullWidth = false,
}: ModuleBadgeProps) {
	return (
		<span
			className={`font-semibold rounded ${fullWidth ? "block w-full" : ""} ${sizeStyles[size]}`}
			style={{ backgroundColor: categoryColors[category], color: onCategoryText }}
		>
			{plural ? category : singularLabels[category]}
		</span>
	);
}
