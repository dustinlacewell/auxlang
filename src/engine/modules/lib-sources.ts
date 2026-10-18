/**
 * The text of the built-in module library (`lib/**\/*.js`) — the only I/O in
 * loading it (raw-files/raw-files.ts says how each host gets the text).
 */

import { type RawFile, bundled, fromDisk, fromGlob } from "../raw-files/raw-files";

/** A library file: its path under lib/ (e.g. `noise.js`) and its text. */
export type LibSource = RawFile;

export function libSources(): LibSource[] {
	if (!bundled()) return fromDisk(new URL("./lib/", import.meta.url));
	const files = import.meta.glob<string>("./lib/**/*.js", {
		query: "?raw",
		import: "default",
		eager: true,
	});
	return fromGlob(files, "./lib/");
}
