import { reset } from "@/core2/eval/reset";
import * as api from "@/core2/api";

reset();

// Poly seq
const s = api.seq("{c3,e3,g3}");
console.log("seq poly result:");
console.log("  type:", Array.isArray(s) ? "array" : typeof s);
console.log("  length:", (s as any).length);

const cv = (s as any).cv;
console.log("\ns.cv result:");
console.log("  type:", Array.isArray(cv) ? "array" : typeof cv);
console.log("  cv:", cv);

const tri = cv?.tri;
console.log("\ns.cv.tri:");
console.log("  exists:", !!tri);
console.log("  type:", typeof tri);
