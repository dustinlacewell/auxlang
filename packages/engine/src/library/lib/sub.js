/** Subtract: x.sub(c) → x - c. */
defmod("sub", { doc: "Subtracts a value from a signal.", args: ["from"] }, () => {
	return ({ in: x = 0, from = 0 }) => x - from
})
