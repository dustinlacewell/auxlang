/** The text of auxlang's math library (`lib/**\/*.js`), one function per file. */

import { type RawFile, bundled, fromDisk, fromGlob } from "../raw-files/raw-files";

export function mathSources(): RawFile[] {
	if (!bundled()) return fromDisk(new URL("./lib/", import.meta.url));
	const files = import.meta.glob<string>("./lib/**/*.js", {
		query: "?raw",
		import: "default",
		eager: true,
	});
	return fromGlob(files, "./lib/");
}
