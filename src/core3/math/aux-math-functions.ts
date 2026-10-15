/**
 * The `Math` functions auxlang implements itself (MANIFESTO §7), with the
 * number of arguments each takes. Inside a tick, helper or lambda,
 * `Math.<name>(...)` calls auxlang's function of the same name in math/lib/;
 * `x ** y` calls `pow`. `hypot` takes exactly two arguments.
 */
export const AUX_MATH_FUNCTIONS: ReadonlyMap<string, number> = new Map([
	["acos", 1],
	["acosh", 1],
	["asin", 1],
	["asinh", 1],
	["atan", 1],
	["atan2", 2],
	["atanh", 1],
	["cbrt", 1],
	["cos", 1],
	["cosh", 1],
	["exp", 1],
	["expm1", 1],
	["hypot", 2],
	["log", 1],
	["log10", 1],
	["log1p", 1],
	["log2", 1],
	["pow", 2],
	["sin", 1],
	["sinh", 1],
	["tan", 1],
	["tanh", 1],
]);
