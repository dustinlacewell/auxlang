/**
 * Vite plugin for importing pattern test case files.
 *
 * Usage in vite.config.ts:
 *   import { patternTestsPlugin } from "./src/tests/patterns/vite-plugin";
 *   plugins: [patternTestsPlugin()]
 *
 * Then import in code:
 *   import tests from "virtual:pattern-tests";
 *
 * Directory structure: cases/{category}/{id}.js (no device level)
 */

import type { Plugin, ViteDevServer } from "vite";
import {
	readdirSync,
	readFileSync,
	statSync,
	mkdirSync,
	writeFileSync,
	unlinkSync,
	existsSync,
} from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
	categoryToDisplayName,
	displayNameToCategory,
	parseTestCase,
	serializeTestCase,
} from "../interactive/parser";
import type { IncomingMessage, ServerResponse } from "node:http";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CASES_DIR = join(__dirname, "cases");

const VIRTUAL_MODULE_ID = "virtual:pattern-tests";
const RESOLVED_VIRTUAL_MODULE_ID = "\0" + VIRTUAL_MODULE_ID;

interface PatternTestDefinition {
	id: string;
	category: string;
	name: string;
	desc: string;
	code: string;
	filePath: string;
}

/**
 * Recursively find all .js files in a directory.
 */
function findJsFiles(dir: string, files: string[] = []): string[] {
	if (!existsSync(dir)) return files;
	for (const entry of readdirSync(dir)) {
		const fullPath = join(dir, entry);
		const stat = statSync(fullPath);
		if (stat.isDirectory()) {
			findJsFiles(fullPath, files);
		} else if (entry.endsWith(".js")) {
			files.push(fullPath);
		}
	}
	return files;
}

/**
 * Load all pattern test cases from the cases directory.
 * Structure: cases/{category}/{id}.js
 */
function loadAllTests(): PatternTestDefinition[] {
	const tests: PatternTestDefinition[] = [];
	const jsFiles = findJsFiles(CASES_DIR);

	for (const file of jsFiles) {
		const relativePath = relative(CASES_DIR, file).replace(/\\/g, "/");
		const parts = relativePath.split("/");

		// Expect exactly 2 levels: category/id.js
		if (parts.length !== 2) continue;

		const [category, filename] = parts;
		const baseId = filename!.replace(/\.js$/, "");
		// ID must be unique across all tests - include category
		const id = `${category}/${baseId}`;

		const content = readFileSync(file, "utf-8");
		const parsed = parseTestCase(content);

		tests.push({
			id,
			category: categoryToDisplayName(category!),
			name: parsed.name,
			desc: parsed.desc,
			code: parsed.code,
			filePath: relativePath,
		});
	}

	return tests;
}

export function patternTestsPlugin(): Plugin {
	return {
		name: "pattern-tests",

		resolveId(id) {
			if (id === VIRTUAL_MODULE_ID) {
				return RESOLVED_VIRTUAL_MODULE_ID;
			}
		},

		load(id) {
			if (id === RESOLVED_VIRTUAL_MODULE_ID) {
				const tests = loadAllTests();
				return `export default ${JSON.stringify(tests, null, 2)};`;
			}
		},

		handleHotUpdate({ file, server }) {
			// If a pattern test file changes, invalidate the virtual module
			if (file.includes("patterns") && file.includes("cases") && file.endsWith(".js")) {
				const mod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_MODULE_ID);
				if (mod) {
					server.moduleGraph.invalidateModule(mod);
					return [mod];
				}
			}
		},

		configureServer(server) {
			server.middlewares.use(async (req, res, next) => {
				if (!req.url?.startsWith("/api/pattern-test")) return next();

				const url = new URL(req.url, "http://localhost");

				if (req.method === "POST" && url.pathname === "/api/pattern-test/save") {
					await handleSave(req, res, server);
				} else if (req.method === "DELETE" && url.pathname === "/api/pattern-test/delete") {
					await handleDelete(req, res, server);
				} else {
					next();
				}
			});
		},
	};
}

function invalidateVirtualModule(server: ViteDevServer) {
	const mod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_MODULE_ID);
	if (mod) {
		server.moduleGraph.invalidateModule(mod);
		// Don't trigger full reload - just invalidate the module
		// The next import of the virtual module will get fresh data
	}
}

async function parseBody(req: IncomingMessage): Promise<unknown> {
	return new Promise((resolve, reject) => {
		let data = "";
		req.on("data", (chunk) => (data += chunk));
		req.on("end", () => {
			try {
				resolve(JSON.parse(data));
			} catch {
				reject(new Error("Invalid JSON"));
			}
		});
		req.on("error", reject);
	});
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
	res.statusCode = status;
	res.setHeader("Content-Type", "application/json");
	res.end(JSON.stringify(body));
}

function isValidId(id: string): boolean {
	return /^[a-z0-9-]+$/.test(id);
}

function isValidPath(str: string): boolean {
	return !str.includes("..") && !str.includes("/") && !str.includes("\\");
}

interface SaveBody {
	category: string;
	id: string;
	name: string;
	desc: string;
	code: string;
	originalPath?: string;
}

async function handleSave(
	req: IncomingMessage,
	res: ServerResponse,
	server: ViteDevServer,
): Promise<void> {
	try {
		const body = (await parseBody(req)) as SaveBody;
		const { category, id, name, desc, code, originalPath } = body;

		if (!category || !id || !name || !code) {
			sendJson(res, 400, { success: false, error: "Missing required fields" });
			return;
		}

		const categorySlug = displayNameToCategory(category);
		// Extract base ID (strip category prefix if present, e.g., "basics/showcase" -> "showcase")
		const baseId = id.includes("/") ? id.split("/").pop()! : id;

		if (!isValidPath(categorySlug) || !isValidId(baseId)) {
			sendJson(res, 400, { success: false, error: "Invalid category or id" });
			return;
		}

		const newPath = join(CASES_DIR, categorySlug, `${baseId}.js`);
		const content = serializeTestCase({ name, desc: desc || "", code });

		// Create directory if needed
		const dir = dirname(newPath);
		if (!existsSync(dir)) {
			mkdirSync(dir, { recursive: true });
		}

		// If original path differs, delete old file
		if (originalPath) {
			const oldPath = join(CASES_DIR, originalPath);
			const normalizedNew = newPath.replace(/\\/g, "/");
			const normalizedOld = oldPath.replace(/\\/g, "/");

			if (normalizedOld !== normalizedNew && existsSync(oldPath)) {
				unlinkSync(oldPath);
			}
		}

		writeFileSync(newPath, content);
		invalidateVirtualModule(server);

		const filePath = `${categorySlug}/${baseId}.js`;
		sendJson(res, 200, { success: true, filePath });
	} catch (err) {
		console.error("Save error:", err);
		sendJson(res, 500, { success: false, error: String(err) });
	}
}

interface DeleteBody {
	category: string;
	id: string;
}

async function handleDelete(
	req: IncomingMessage,
	res: ServerResponse,
	server: ViteDevServer,
): Promise<void> {
	try {
		const body = (await parseBody(req)) as DeleteBody;
		const { category, id } = body;

		if (!category || !id) {
			sendJson(res, 400, { success: false, error: "Missing required fields" });
			return;
		}

		const categorySlug = displayNameToCategory(category);
		// Extract base ID (strip category prefix if present)
		const baseId = id.includes("/") ? id.split("/").pop()! : id;

		if (!isValidPath(categorySlug) || !isValidId(baseId)) {
			sendJson(res, 400, { success: false, error: "Invalid category or id" });
			return;
		}

		const filePath = join(CASES_DIR, categorySlug, `${baseId}.js`);

		if (!existsSync(filePath)) {
			sendJson(res, 404, { success: false, error: "File not found" });
			return;
		}

		unlinkSync(filePath);
		invalidateVirtualModule(server);

		sendJson(res, 200, { success: true });
	} catch (err) {
		console.error("Delete error:", err);
		sendJson(res, 500, { success: false, error: String(err) });
	}
}
