/**
 * Checks a module's `display` declaration (ModuleSpec.display) against its
 * real state-field shapes, known only after a trial run of `state()`
 * (define-module.ts): `buffer` must name a typed-array state field, `head` a
 * numeric state field, `traces` a positive integer. Called from
 * define-module.ts, not lowerModule itself — lowering is pure and runs
 * before any field's shape is known.
 */

import type { StateShape } from "../front/state/state-shape";
import type { DisplayDecl } from "../../types";

export function validateDisplay(
	name: string,
	display: DisplayDecl,
	shapes: ReadonlyMap<string, StateShape>,
): void {
	const what = `module '${name}': display`;
	const fields = [...shapes.keys()];

	if (!Number.isInteger(display.traces) || display.traces <= 0) {
		throw new Error(`${what}.traces must be a positive integer, got ${display.traces}`);
	}

	const bufferShape = shapes.get(display.buffer);
	if (bufferShape === undefined || bufferShape.k !== "array") {
		throw new Error(
			`${what}.buffer '${display.buffer}' must name a typed-array state field. state fields: [${fields.join(", ")}]`,
		);
	}

	const headShape = shapes.get(display.head);
	if (headShape === undefined || headShape.k !== "number") {
		throw new Error(
			`${what}.head '${display.head}' must name a numeric state field. state fields: [${fields.join(", ")}]`,
		);
	}
}
