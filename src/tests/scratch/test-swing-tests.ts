import { reset } from "@/core2/eval/reset";
import * as api from "@/core2/api";
import { getBuilder } from "@/core2/graph/graph-builder";
import * as fs from "node:fs";
import * as path from "node:path";

const swingDir = "src/tests/interactive/cases/timing/swing";

for (const file of fs.readdirSync(swingDir)) {
	if (!file.endsWith(".js")) continue;

	const code = fs.readFileSync(path.join(swingDir, file), "utf-8");
	reset();

	try {
		const fn = new Function(...Object.keys(api), code);
		fn(...Object.values(api));

		const nodes = getBuilder().getNodes();
		const hasOut = nodes.some((n) => n.device === "out");
		if (!hasOut) {
			console.log(`✗ ${file}: No out() call`);
		} else {
			console.log(`✓ ${file}: ${nodes.length} nodes`);
		}
	} catch (err) {
		console.log(`✗ ${file}: ${err}`);
	}
}
