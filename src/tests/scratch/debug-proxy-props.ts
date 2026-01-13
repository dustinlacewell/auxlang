import { adsr } from "@/core2/api";
import { reset } from "@/core2/eval/reset";

reset();

// Create a wrapped adsr node
const wrapped = adsr();

console.log("typeof wrapped:", typeof wrapped);
console.log("wrapped.id:", wrapped.id);
console.log("wrapped.device:", wrapped.device);
console.log("'id' in wrapped:", "id" in wrapped);
console.log("'device' in wrapped:", "device" in wrapped);

// Check what happens when we try to normalize it
function isNode(value: unknown): boolean {
	if (value === null || value === undefined) return false;
	const t = typeof value;
	if (t !== "object" && t !== "function") return false;

	const v = value as Record<string, unknown>;
	return "id" in v && "device" in v && typeof v.id === "string" && typeof v.device === "string";
}

console.log("\nisNode(wrapped):", isNode(wrapped));

// Let's also see what Object.keys gives us
console.log("\nObject.keys(wrapped):", Object.keys(wrapped as object));

// And own property names
console.log("\nObject.getOwnPropertyNames(wrapped):", Object.getOwnPropertyNames(wrapped as object));
