/**
 * Map a palette's members: a number maps through `f`, a signal maps through
 * `onSignal` (e.g. `.add`/`.mul` on the Handle, each a new graph node).
 */

import type { Handle } from "../../patch/handle-data";
import type { PaletteSignal } from "./palette-signal";
import { isSignalMember } from "./palette-signal";

export function mapPalette(
	palette: readonly PaletteSignal[],
	f: (n: number) => number,
	onSignal: (s: Handle) => PaletteSignal,
): readonly PaletteSignal[] {
	return palette.map((m) => (isSignalMember(m) ? onSignal(m) : f(m)));
}
