/**
 * The fields the engine injects into a lane's state: its lane index, its
 * seed and its derived data. They are the new engine's own, so they are not
 * part of a state's shape when it carries (shape-fits.ts).
 */

export const ENGINE_FIELDS: ReadonlySet<string> = new Set(["__lane", "__scratch", "__seed"]);

/** A record's field names minus the engine's. */
export function shapeKeys(fields: Readonly<Record<string, unknown>>): string[] {
	return Object.keys(fields).filter((name) => !ENGINE_FIELDS.has(name));
}
