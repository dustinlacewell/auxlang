import * as api from "../../core2/api";
import { evalToExpanded } from "../../core2/eval/pipeline";

const code = `
let clk = clock(130)

// Pentatonic bass line (A minor pentatonic)
let bass = seq("a1 ~ c2 d2 ~ e2 g2 ~", { clk })
bass
  .saw()
  .lpf({ cutoff: 600, resonance: 0.2 })
  .gain(bass.gate.adsr({ attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.1 }))
  .out()

// Arpeggiated lead (higher register, faster)
let arp = seq("a4 c5 e5 g5 a5 g5 e5 c5", { clk: clockMult(clk.trig).by(2) })
arp
  .tri()
  .lpf({ cutoff: 3000, resonance: 0.4 })
  .gain(arp.gate.adsr({ attack: 0.005, decay: 0.15, sustain: 0.2, release: 0.3 }))
  .delay({ time: 0.375, feedback: 0.4, mix: 0.3 })
  .out()

// Pad chord (slow attack, lush)
let pad = seq("{a3,c4,e4} ~ {g3,c4,e4} ~", { clk: clockDiv(clk.trig).by(4) })
pad
  .tri()
  .lpf({ cutoff: 1800, resonance: 0.1 })
  .gain(pad.gate.adsr({ attack: 0.4, decay: 0.3, sustain: 0.6, release: 0.8 }))
  .reverb({ room: 0.7, wet: 0.4 })
  .out()

// Kick on 1 and 3
seq("c4 ~ c4 ~", { clk })
  .trig
  .kick({ decay: 0.4 })
  .out()

// Snare on 2 and 4
seq("~ c4 ~ c4", { clk })
  .trig
  .snare({ snappy: 0.6, decay: 0.12 })
  .reverb({ room: 0.3, wet: 0.15 })
  .out()

// Hi-hats, offbeat 16ths
seq("~ c4", { clk: clockMult(clk).by(4) })
  .trig
  .hihat({ decay: 0.03, tone: 0.7 })
  .gain({ amount: 0.6 })
  .out()
`;

const expanded = evalToExpanded(code, api);

// Count by device type
const counts = new Map<string, number>();
for (const node of expanded.nodes) {
	counts.set(node.device, (counts.get(node.device) ?? 0) + 1);
}

console.log(`Total nodes: ${expanded.nodes.length}\n`);
console.log("By device:");
for (const [device, count] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
	console.log(`  ${device}: ${count}`);
}

console.log("\nAll nodes:");
for (const node of expanded.nodes) {
	console.log(`  ${node.id}: ${node.device}`);
}
