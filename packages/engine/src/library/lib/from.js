/** Subtract the input from a value: x.from(c) → c - x. */
defmod("from", { doc: "Subtracts a signal from a value.", args: ["value"] }, () => {
	return ({ in: x = 0, value = 0 }) => value - x
})
