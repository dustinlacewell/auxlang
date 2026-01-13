import { reset } from "@/core2/eval/reset";
import * as api from "@/core2/api";

reset();

const c = api.chord(261.63);
console.log("chord result:");
console.log("  type:", Array.isArray(c) ? "array" : typeof c);
console.log("  length:", (c as any).length);
console.log("  [0]:", (c as any)[0]);

const t = (c as any).tri();
console.log("\nchord().tri() result:");
console.log("  type:", Array.isArray(t) ? "array" : typeof t);
console.log("  length:", (t as any).length);
if ((t as any)[0]) {
  console.log("  [0].device:", (t as any)[0].device);
}

const g = (t as any).gain?.(0.3);
console.log("\nchord().tri().gain(0.3) result:");
console.log("  exists:", !!g);
if (g) {
  console.log("  type:", Array.isArray(g) ? "array" : typeof g);
}
