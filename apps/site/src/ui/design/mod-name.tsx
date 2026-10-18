/**
 * The one way to render a module's name in the UI: monospace, colored by the
 * module's category. No color prop exists on purpose — consumers name the
 * category and the palette in src/ui/design/colors.ts does the rest.
 */

import type { Category } from "auxlang/types";
import { categoryColors } from "@/ui/design/colors";

interface ModNameProps {
	name: string;
	category: Category;
	bold?: boolean;
}

export function ModName({ name, category, bold = true }: ModNameProps) {
	return (
		<span
			className={`font-mono ${bold ? "font-bold" : ""}`}
			style={{ color: categoryColors[category] }}
		>
			{name}
		</span>
	);
}
