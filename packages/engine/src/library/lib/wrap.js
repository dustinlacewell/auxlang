/** Modulo — remainder of `in` by `by` (0 → 0). Named `wrap` so `.mod` means modulation. */
defmod("wrap", { doc: "Wraps a signal by modulo — the arithmetic remainder of in by `by`.", args: ["by"] }, () => {
	return ({ in: x = 0, by = 1 }) => (by === 0 ? 0 : x % by)
})
