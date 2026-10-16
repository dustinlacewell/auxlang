/**
 * withRecord — the `with` op's constructor: the child's events gain one value
 * per named field (ast.ts). Field names are identifiers, so each names a seq
 * output; fields are stored sorted by name, so equal records give equal ASTs
 * (pattern-key.ts). Loud at build time.
 */

import type { Pat, RecordField } from "./ast";

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

export function withRecord(fields: Readonly<Record<string, Pat>>, child: Pat): Pat {
	const names = Object.keys(fields).sort();
	if (names.length === 0) throw new Error("with: needs at least one field, e.g. .with({ vel: p`1 0.5` })");
	for (const name of names) {
		if (!IDENTIFIER.test(name)) {
			throw new Error(`with: field name '${name}' is not an identifier (letters, digits, _ and $)`);
		}
	}
	const record: RecordField[] = names.map((name) => ({ name, pat: fields[name] as Pat }));
	return { op: "with", fields: record, child };
}
