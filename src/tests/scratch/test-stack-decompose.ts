/**
 * Debug: Test stack decomposition preserves srcStart/srcEnd
 */

import { parseExpr } from "@/core2/devices/seq/ast/parse";
import { decomposePattern } from "@/core2/devices/seq/voices/decompose";

const pattern = "{c4,e4,g4}(3,8)";

const expr = parseExpr(pattern);
console.log("Original expr:");
console.log(JSON.stringify(expr, null, 2));
console.log("");

const monoExprs = decomposePattern(expr, "isolate");
console.log(`Decomposed into ${monoExprs.length} voices:`);
for (let i = 0; i < monoExprs.length; i++) {
	console.log(`\nVoice ${i}:`);
	console.log(JSON.stringify(monoExprs[i], null, 2));
}
