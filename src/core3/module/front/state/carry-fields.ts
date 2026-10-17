/**
 * Which of a lane's fields carry into a fresh re-eval (MANIFESTO §5.1, card
 * "Re-eval carry rule"), by shape-C's `writes` (lower/tick-writes.ts): a
 * written field is a bug risk if its old value is stale or ill-shaped, so it
 * only carries when it still fits (shape-fits.ts); a read-only field is
 * rebuilt fresh every time, so an edited setup constant takes effect at
 * once. `__rng` (the random stream) is always treated as written: it must
 * fit (it always does, as a plain value) and so always carries.
 */

import { shapeKeys } from "./engine-fields";
import { shapeFits } from "./shape-fits";
import type { RecordState, StateShape } from "./state-shape";

const STREAM = "__rng";

/**
 * The fresh lane's fields to carry from the old lane, or null for a lane
 * that starts fresh. `old`/`fresh`: a lane's state shape, as `laneShapeOf`
 * gives it (the engine's fields already out).
 */
export function carryFields(
	old: RecordState,
	fresh: RecordState,
	writes: ReadonlySet<string> | readonly string[],
): readonly string[] | null {
	const written = new Set(writes);
	written.add(STREAM);
	const names = shapeKeys(fresh.fields);
	for (const name of names) {
		if (!written.has(name)) continue;
		const from = old.fields[name];
		if (from === undefined) continue;
		const to = fresh.fields[name] as StateShape;
		if (!shapeFits(from, to)) return null;
	}
	return names.filter((name) => written.has(name) && Object.hasOwn(old.fields, name));
}
