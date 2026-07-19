/**
 * The one way to render a signal unit's color in the UI: a small pastel chip
 * keyed by `Unit`. No color prop exists on purpose — consumers can only name
 * the unit, so every swatch follows the palette in src/theme/colors.ts by
 * construction.
 */

import type { Unit } from "@/core3/types";
import { unitColors } from "@/theme/colors";

interface PortSwatchProps {
	unit: Unit;
}

export function PortSwatch({ unit }: PortSwatchProps) {
	return (
		<span
			className="inline-block w-2 h-2 rounded-sm"
			style={{ backgroundColor: unitColors[unit] }}
		/>
	);
}
