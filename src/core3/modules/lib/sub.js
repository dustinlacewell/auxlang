/** Subtract: `sub(x).from(y)` → y - x. */
defmod("sub", { doc: "Subtracts one signal from another.", args: ["from"] }, () => {
	return ({ in: x = 0, from = 0 }) => from - x
})
