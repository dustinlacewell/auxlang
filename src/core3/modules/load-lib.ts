/**
 * Register the built-in module library by evaluating its source files at root
 * scope — the same `defmod` path a patch-defined module takes. Each file runs
 * with the library scope as its only names, and with its own text current so
 * a tick error names the file and line.
 */

import { withSourceText } from "../module/source-text";
import { defmod } from "../patch/defmod";
import { gatePort, optional, phasePort, sig, trigPort, unit } from "../types";
import { hzToSemis, semisToHz } from "../units/pitch";
import { beats, hz, secs, semis } from "../units/tag";
import type { LibSource } from "./lib-sources";

/**
 * What a library file can name: `defmod`, the port annotations, and the pure
 * functions a module may list in its `helpers` (their text, not their
 * closure, is what the tick runs).
 */
const LIB_SCOPE: Readonly<Record<string, unknown>> = {
	defmod,
	sig,
	unit,
	gatePort,
	trigPort,
	phasePort,
	optional,
	hz,
	semis,
	secs,
	beats,
	semisToHz,
	hzToSemis,
};

export function loadLib(sources: readonly LibSource[]): void {
	for (const source of sources) {
		withSourceText({ file: `lib/${source.file}`, text: source.text }, () => evalLibFile(source));
	}
}

function evalLibFile(source: LibSource): void {
	const names = Object.keys(LIB_SCOPE);
	const body = `"use strict"; ${source.text}\n//# sourceURL=auxlang://lib/${source.file}`;
	new Function(...names, body)(...names.map((name) => LIB_SCOPE[name]));
}
