/**
 * Field accesses no state has, and their loud errors. State shape is fixed
 * at start: a read of a field a record lacks is a typo, a write would add
 * one. A record's fields are named, never indexed. A number or boolean has
 * no fields.
 */

export type FieldFault =
	| { readonly k: "missing"; readonly field: string; readonly write: boolean }
	| { readonly k: "indexed" }
	| { readonly k: "scalar"; readonly field: string };

export function fieldFaultMessage(fault: FieldFault): string {
	switch (fault.k) {
		case "missing":
			return fault.write
				? `adds field '${fault.field}' — state shape is fixed at start; declare it in state()`
				: `unknown field '${fault.field}' — declare it in state()`;
		case "indexed":
			return "record fields must be named, not computed";
		case "scalar":
			return `reads field '${fault.field}' of a value that is not a record`;
	}
}
