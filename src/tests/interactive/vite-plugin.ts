/**
 * Vite plugin for importing interactive test case files.
 *
 * Usage in vite.config.ts:
 *   import { interactiveTestsPlugin } from "./src/tests/interactive/vite-plugin";
 *   plugins: [interactiveTestsPlugin()]
 *
 * Then import in code:
 *   import tests from "virtual:interactive-tests";
 */

import type { Plugin, ViteDevServer } from "vite";
import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { categoryToDisplayName, displayNameToCategory, parseTestCase, serializeTestCase } from "./parser";
import type { IncomingMessage, ServerResponse } from "node:http";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CASES_DIR = join(__dirname, "cases");

const VIRTUAL_MODULE_ID = "virtual:interactive-tests";
const RESOLVED_VIRTUAL_MODULE_ID = "\0" + VIRTUAL_MODULE_ID;

interface TestDefinition {
	id: string;
	category: string;
	device: string;
	name: string;
	desc: string;
	code: string;
	filePath: string;
}

/**
 * Recursively find all .js files in a directory.
 */
function findJsFiles(dir: string, files: string[] = []): string[] {
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
 * Load all test cases from the cases directory.
 */
function loadAllTests(): TestDefinition[] {
	const tests: TestDefinition[] = [];
	const jsFiles = findJsFiles(CASES_DIR);

	for (const file of jsFiles) {
		const relativePath = relative(CASES_DIR, file).replace(/\\/g, "/");
		const parts = relativePath.split("/");

		if (parts.length !== 3) continue;

		const [category, device, filename] = parts;
		const id = filename!.replace(/\.js$/, "");

		const content = readFileSync(file, "utf-8");
		const parsed = parseTestCase(content);

		tests.push({
			id,
			category: categoryToDisplayName(category!),
			device: device!,
			name: parsed.name,
			desc: parsed.desc,
			code: parsed.code,
			filePath: relativePath,
		});
	}

	return tests;
}

export function interactiveTestsPlugin(): Plugin {
	return {
		name: "interactive-tests",

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
			// If a test file changes, invalidate the virtual module
			if (file.includes("cases") && file.endsWith(".js")) {
				const mod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_MODULE_ID);
				if (mod) {
					server.moduleGraph.invalidateModule(mod);
					return [mod];
				}
			}
		},

		configureServer(server) {
			server.middlewares.use(async (req, res, next) => {
				if (!req.url?.startsWith("/api/test")) return next();

				const url = new URL(req.url, "http://localhost");

				if (req.method === "POST" && url.pathname === "/api/test/save") {
					await handleSave(req, res, server);
				} else if (req.method === "DELETE" && url.pathname === "/api/test/delete") {
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
		server.ws.send({ type: "full-reload" });
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
	device: string;
	id: string;
	name: string;
	desc: string;
	code: string;
	originalPath?: string;
}

async function handleSave(req: IncomingMessage, res: ServerResponse, server: ViteDevServer): Promise<void> {
	try {
		const body = (await parseBody(req)) as SaveBody;
		const { category, device, id, name, desc, code, originalPath } = body;

		// Validation
		if (!category || !device || !id || !name || !code) {
			sendJson(res, 400, { success: false, error: "Missing required fields" });
			return;
		}

		const categorySlug = displayNameToCategory(category);

		if (!isValidPath(categorySlug) || !isValidPath(device) || !isValidId(id)) {
			sendJson(res, 400, { success: false, error: "Invalid category, device, or id" });
			return;
		}

		const newPath = join(CASES_DIR, categorySlug, device, `${id}.js`);
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

		const filePath = `${categorySlug}/${device}/${id}.js`;
		sendJson(res, 200, { success: true, filePath });
	} catch (err) {
		console.error("Save error:", err);
		sendJson(res, 500, { success: false, error: String(err) });
	}
}

interface DeleteBody {
	category: string;
	device: string;
	id: string;
}

async function handleDelete(req: IncomingMessage, res: ServerResponse, server: ViteDevServer): Promise<void> {
	try {
		const body = (await parseBody(req)) as DeleteBody;
		const { category, device, id } = body;

		if (!category || !device || !id) {
			sendJson(res, 400, { success: false, error: "Missing required fields" });
			return;
		}

		const categorySlug = displayNameToCategory(category);

		if (!isValidPath(categorySlug) || !isValidPath(device) || !isValidId(id)) {
			sendJson(res, 400, { success: false, error: "Invalid category, device, or id" });
			return;
		}

		const filePath = join(CASES_DIR, categorySlug, device, `${id}.js`);

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
