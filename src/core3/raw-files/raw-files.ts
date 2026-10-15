/**
 * The text of the `.js` files under a source folder — the engine's library
 * code that runs as text (module/lib, math/lib). Under vite and vitest the
 * caller's `import.meta.glob(..., { query: "?raw" })` inlines them; under
 * plain node (tsx scripts) they are read from disk. Either way the result is
 * sorted by path, so every host sees the same order.
 */

export interface RawFile {
	/** Path under the folder, e.g. `noise.js` or `trig/sin.js`. */
	readonly file: string;
	readonly text: string;
}

/** True when a bundler inlined the files (`import.meta.env` exists). */
export function bundled(): boolean {
	return import.meta.env !== undefined;
}

/** Files from an eager raw `import.meta.glob`, keys made relative by dropping `prefix`. */
export function fromGlob(files: Readonly<Record<string, string>>, prefix: string): RawFile[] {
	return byPath(
		Object.entries(files).map(([path, text]) => ({ file: path.slice(prefix.length), text })),
	);
}

/** Every `.js` file under `dir`, read from disk. */
export function fromDisk(dir: URL): RawFile[] {
	const fs = process.getBuiltinModule("node:fs");
	const url = process.getBuiltinModule("node:url");
	const root = url.fileURLToPath(dir);
	const entries = fs.readdirSync(root, { recursive: true, encoding: "utf8" });
	return byPath(
		entries
			.map((entry) => entry.replaceAll("\\", "/"))
			.filter((file) => file.endsWith(".js"))
			.map((file) => ({ file, text: fs.readFileSync(`${root}/${file}`, "utf8") })),
	);
}

function byPath(files: RawFile[]): RawFile[] {
	return files.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0));
}
