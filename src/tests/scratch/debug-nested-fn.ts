import * as api from "@/core2/api";
import { collect } from "@/core2/eval/collect";
import { reset } from "@/core2/eval/reset";
import { runCode } from "@/core2/eval/run-code";
import { expandPoly } from "@/core2/graph/expand-poly";
import { compile } from "@/core2/runtime/compile";

// Exact tri showcase code
const code = `clock(60).seq("{c4,e4,g4}").apply(s =>
  s.cv.tri().lpf({ cutoff: 800 }).gain({ level: s.gate.adsr({ attack: 0.3, release: 0.5 }) }).out()
)`;

reset();
runCode(code, api);

const graph = collect();
const expanded = expandPoly(graph);
const runtime = compile(expanded);

// Check for functions hidden in objects
function findFunctions(obj: unknown, path: string): string[] {
	const found: string[] = [];
	if (typeof obj === "function") {
		found.push(`${path}: function`);
	} else if (Array.isArray(obj)) {
		obj.forEach((item, i) => {
			found.push(...findFunctions(item, `${path}[${i}]`));
		});
	} else if (typeof obj === "object" && obj !== null) {
		for (const [key, value] of Object.entries(obj)) {
			found.push(...findFunctions(value, `${path}.${key}`));
		}
	}
	return found;
}

console.log("Checking all node configs for nested functions:");
for (const node of runtime.nodes) {
	const funcs = findFunctions(node.config, `${node.device}.config`);
	if (funcs.length > 0) {
		console.log(`\n${node.device} (${node.id}):`);
		for (const f of funcs) {
			console.log(`  ${f}`);
		}
	}
}
