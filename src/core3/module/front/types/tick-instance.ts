/**
 * One node lane as its tick is specialised for it, the same on every engine:
 * a fresh lane state, what each input is bound to, the config, the sample
 * rate and the reducer width. Its key names everything a tick plan can
 * depend on but the state, which the module and sample rate fix.
 */

import { configTy } from "./value-ty";
import { tyKey } from "./ty";

/** What an input reads in this lane. */
export type LaneInput =
	| { readonly k: "const"; readonly v: number }
	/** Another node's output, this sample or last. */
	| { readonly k: "live" }
	| { readonly k: "lambda" }
	/** A reducer's input: the source lanes as an f64 array. */
	| { readonly k: "gathered"; readonly length: number }
	/** A port the lane does not bind. */
	| { readonly k: "absent" };

export interface TickInstance {
	readonly state: Readonly<Record<string, unknown>>;
	readonly inputs: Readonly<Record<string, LaneInput>>;
	readonly config: Readonly<Record<string, unknown>>;
	readonly sampleRate: number;
	readonly width: number;
}

export function instanceKey(instance: TickInstance): string {
	const inputs = Object.entries(instance.inputs).map(([port, input]) => `${port}:${inputKey(input)}`);
	const config = Object.entries(instance.config).map(
		([field, value]) => `${field}=${tyKey(configTy(value))}`,
	);
	return `${inputs.join(",")}|${config.join(",")}|${instance.sampleRate}|${instance.width}`;
}

function inputKey(input: LaneInput): string {
	switch (input.k) {
		case "const":
			return Object.is(input.v, -0) ? "c-0" : `c${input.v}`;
		case "gathered":
			return `g${input.length}`;
		default:
			return input.k;
	}
}
