/**
 * What a tick's parameter records hold, for one specialisation: the type of
 * each state field, input and config field, and of the sample rate and
 * width. The checker's root knows only the module (every input a number);
 * an engine's root knows one node lane (a constant input folds).
 */

import { NUM, type RecordRef, type Ty } from "./ty";
import { configTy, recordRef, stateTy } from "./value-ty";

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

/** The root the kind check walks a tick from: fresh state and config, inputs unknown numbers. */
export function moduleRoot(
	state: Record<string, unknown>,
	config: Record<string, unknown>,
): TickRoot {
	return {
		state: (field) => (Object.hasOwn(state, field) ? stateTy(state[field]) : undefined),
		input: () => NUM,
		config: (field) => configTy(config[field]),
		stateRecord: recordRef(state),
		sampleRate: NUM,
		width: NUM,
	};
}
