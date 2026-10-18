import * as acorn from "acorn";
const code = "saw().freq(440).out()";
const ast = acorn.parse(code, { ecmaVersion: "latest" });
console.log(JSON.stringify(ast, null, 2));
