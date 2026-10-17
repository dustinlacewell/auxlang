/** Comparators — each emits a 0/1 gate. gt/lt compare `in` against `than`, eq with tolerance. */
for (const [name, mode, doc] of [
	["gt", "gt", "Emits a gate when the input is greater than the threshold."],
	["lt", "lt", "Emits a gate when the input is less than the threshold."],
	["eq", "eq", "Emits a gate when the input equals the threshold."],
]) {
	defmod(name, { doc, args: ["than"], config: { mode } }, ({ mode }) => {
		return ({ in: x = 0, than = 0 }) => {
			if (mode === "gt") {
				return x > than ? 1 : 0
			}
			if (mode === "lt") {
				return x < than ? 1 : 0
			}
			return Math.abs(x - than) < 1e-4 ? 1 : 0
		}
	})
}
