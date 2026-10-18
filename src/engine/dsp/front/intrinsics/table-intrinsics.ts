/**
 * The table intrinsics (MANIFESTO §5.1): how a module that declares
 * `reads: "pattern"` reads its lane's event table (pattern/table/event-table.ts).
 * Only its tick may call them, since the table belongs to the lane:
 *
 *   __tableFill(cycle)      refill the table with the rows of `cycle`
 *   __tableCycle()          the cycle the table holds (NaN before a fill)
 *   __tableCount()          its row count
 *   __tableRow(field, row)  one row's field; `field` is a string literal
 *                           naming one of TABLE_ROW_FIELDS
 *   __tableField(k, row)    one row's record field k (pattern/record-fields.ts
 *                           order); k below the field count
 *
 * Each backend binds them: JS to the lane's scratch table
 * (tick-build/bind-table.ts), WASM to memory loads and `env.fill`
 * (wasm/bridge/table-intrinsics.ts).
 */

/** Intrinsic name → its argument count. */
export const TABLE_INTRINSICS: ReadonlyMap<string, number> = new Map([
	["__tableFill", 1],
	["__tableCycle", 0],
	["__tableCount", 0],
	["__tableRow", 2],
	["__tableField", 2],
]);

/** The row fields `__tableRow` reads, in the order the WASM layout stores them. */
export const TABLE_ROW_FIELDS = [
	"begin",
	"end",
	"value",
	"kind",
	"noteId",
	"slideFrom",
	"dipBefore",
] as const;

export type TableRowField = (typeof TABLE_ROW_FIELDS)[number];

export function isTableRowField(name: unknown): name is TableRowField {
	return (TABLE_ROW_FIELDS as readonly unknown[]).includes(name);
}
