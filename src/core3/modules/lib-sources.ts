/**
 * The text of the built-in module library (`lib/**\/*.js`) — the only I/O in
 * loading it. Under vite and vitest the bundler inlines the files
 * (`import.meta.glob` with `?raw`); under plain node (tsx scripts) they are
 * read from disk. Either way the result is sorted by path, so every host
 * registers the library in the same order.
 */

export interface LibSource {
	/** Path under lib/, e.g. `noise.js`. */
	readonly file: string;
	readonly text: string;
}

export function libSources(): LibSource[] {
	const found = import.meta.env === undefined ? fromDisk() : fromBundler();
	return found.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0));
}

function fromBundler(): LibSource[] {
	const files = import.meta.glob<string>("./lib/**/*.js", {
		query: "?raw",
		import: "default",
		eager: true,
	});
	return Object.entries(files).map(([path, text]) => ({
		file: path.replace(/^\.\/lib\//, ""),
		text,
	}));
}

function fromDisk(): LibSource[] {
	const fs = process.getBuiltinModule("node:fs");
	const url = process.getBuiltinModule("node:url");
	const dir = url.fileURLToPath(new URL("./lib/", import.meta.url));
	const entries = fs.readdirSync(dir, { recursive: true, encoding: "utf8" });
	return entries
		.map((entry) => entry.replaceAll("\\", "/"))
		.filter((file) => file.endsWith(".js"))
		.map((file) => ({ file, text: fs.readFileSync(`${dir}/${file}`, "utf8") }));
}
