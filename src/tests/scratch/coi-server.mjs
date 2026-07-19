import fs from "node:fs";
// Static server for dist/ that sets COOP/COEP so the page is cross-origin
// isolated — which is what unlocks performance.now() (sub-ms) inside the
// AudioWorkletGlobalScope in Chromium. Diagnostic-only; not part of the app.
// Usage: node coi-server.mjs <port>
import http from "node:http";
import path from "node:path";

const port = Number(process.argv[2]) || 4318;
const root = path.resolve("dist");
const mime = {
	".html": "text/html",
	".js": "text/javascript",
	".mjs": "text/javascript",
	".css": "text/css",
	".svg": "image/svg+xml",
	".json": "application/json",
	".wasm": "application/wasm",
};

http
	.createServer((req, res) => {
		const url = (req.url || "/").split("?")[0];
		let file = path.join(root, url === "/" ? "index.html" : url);
		if (!fs.existsSync(file) || fs.statSync(file).isDirectory())
			file = path.join(root, url + ".html");
		res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
		res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
		if (!fs.existsSync(file)) {
			res.writeHead(404);
			return res.end("not found");
		}
		res.setHeader("Content-Type", mime[path.extname(file)] || "application/octet-stream");
		fs.createReadStream(file).pipe(res);
	})
	.listen(port, () => console.log(`COI server on http://localhost:${port}`));
