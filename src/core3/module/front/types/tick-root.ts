/**
 * What a tick's parameter records hold, for one specialisation: the type of
 * each state field, input and config field, and of the sample rate and
 * width. Read from one node lane (tick-instance.ts): a constant input folds,
 * a gathered input is an f64 array of the source lanes, config folds, the
 * sample rate and width are constants. State is the fresh lane state but
 * `__scratch`, the engine's derived data that no tick reads as a field.
 */

import type { LaneInput, TickInstance } from "./tick-instance";
import { NUM, type RecordRef, type Ty, UNKNOWN, known } from "./ty";
import { configTy, stateTy } from "./value-ty";

export interface TickRoot {
	/** A state field's type; undefined when the state has no such field. */
	state(field: string): Ty | undefined;
	input(port: string): Ty;
	config(field: string): Ty;
	/** The whole state record, passed to a helper. */
	readonly stateRecord: RecordRef;
	readonly sampleRate: Ty;
	readonly width: Ty;
}

const SCRATCH = "__scratch";

export function instanceRoot(instance: TickInstance): TickRoot {
	const stateRecord = stateRecordOf(instance.state);
	return {
		state: (field) => (Object.hasOwn(stateRecord.fields, field) ? stateRecord.fields[field] : undefined),
		input: (port) => inputTy(instance.inputs[port]),
		config: (field) => configTy(instance.config[field]),
		stateRecord,
		sampleRate: known(instance.sampleRate),
		width: known(instance.width),
	};
}

function stateRecordOf(state: Readonly<Record<string, unknown>>): RecordRef {
	const fields: Record<string, Ty> = {};
	for (const [name, value] of Object.entries(state)) if (name !== SCRATCH) fields[name] = stateTy(value);
	return { k: "record", fields };
}

function inputTy(input: LaneInput | undefined): Ty {
	switch (input?.k) {
		case "const":
			return known(input.v);
		case "live":
		case "lambda":
			return NUM;
		case "gathered":
			return { k: "ref", shape: { k: "array", type: "f64", length: input.length }, placed: false };
		default:
			return UNKNOWN;
	}
}
