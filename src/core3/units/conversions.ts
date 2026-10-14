/**
 * The conversions a port performs on a tagged value: hz↔semis and
 * beats↔secs. Each names the module that converts a signal per sample;
 * `fold` converts a constant at bind time. beats↔secs has no fold — it needs
 * the governing clock's tempo, which only the running patch knows.
 */

import type { Unit } from "../types";
import { hzToSemis, semisToHz } from "./pitch";

export interface Conversion {
	readonly module: string;
	readonly fold?: (x: number) => number;
}

const CONVERSIONS: Readonly<Record<string, Conversion>> = {
	"hz>semis": { module: "hz2semis", fold: hzToSemis },
	"semis>hz": { module: "semis2hz", fold: semisToHz },
	"beats>secs": { module: "beats2secs" },
	"secs>beats": { module: "secs2beats" },
};

/** The conversion from one unit to another, or null when none exists. */
export function conversionFor(from: Unit, to: Unit): Conversion | null {
	return CONVERSIONS[`${from}>${to}`] ?? null;
}

/** The units a value in `from` converts into (for error messages). */
export function convertibleTo(from: Unit): string[] {
	return Object.keys(CONVERSIONS)
		.filter((key) => key.startsWith(`${from}>`))
		.map((key) => key.slice(from.length + 1));
}
