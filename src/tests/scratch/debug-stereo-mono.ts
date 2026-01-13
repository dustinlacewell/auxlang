import * as api from "../../core2/api";
import { evalToExpanded } from "../../core2/eval/pipeline";

const code = `
let clk = clock(130)

// Bass (mono)
let bass = seq("a1 ~ c2 d2", { clk })
bass.saw().gain(0.3).out()

// Hihat (mono)
seq("~ c4", { clk: clockMult(clk).by(4) })
  .trig
  .hihat({ decay: 0.03 })
  .gain(0.3)
  .out()
`;

try {
	const expanded = evalToExpanded(code, api);
	console.log("Expanded nodes:");
	for (const n of expanded.nodes) {
		console.log(`  ${n.id}: ${n.device}`);
	}
	console.log("\nLeft outputs:", expanded.leftOutputIds);
	console.log("Right outputs:", expanded.rightOutputIds);
} catch (e) {
	console.error("Error:", e);
}
