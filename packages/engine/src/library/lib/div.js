/** Divide input by `by` (0 → 0, avoiding Infinity/NaN in the graph). */
defmod("div", { doc: "Divides one signal by another.", args: ["by"] }, () => {
	return ({ in: x = 0, by = 1 }) => (by === 0 ? 0 : x / by)
})
