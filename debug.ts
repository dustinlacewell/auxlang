import { parse } from "./src/devices/seq/parse";

// Test simple group first
console.log("Simple group [c4 e4]:");
console.log(JSON.stringify(parse("[c4 e4]"), null, 2));

console.log("\nOuter group only [[c4 e4]]:");
console.log(JSON.stringify(parse("[[c4 e4]]"), null, 2));

console.log("\nDeep [c4 [e4 [g4 b4]]]:");
console.log(JSON.stringify(parse("[c4 [e4 [g4 b4]]]"), null, 2));
