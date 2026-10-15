/**
 * Modules whose tick is NOT held to the tick subset and NOT rebuilt from
 * source: their tick runs as the host closure it was written as. This list
 * exists only for the bridge modules, which still call TypeScript helpers
 * (bridge/, pattern/table/) from their ticks. Moving those into `helpers`
 * empties it; nothing else may be added.
 */
export const EXEMPT_MODULES: ReadonlySet<string> = new Set(["seq", "clock", "counter"]);
