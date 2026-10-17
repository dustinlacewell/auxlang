/** Absolute value. */
defmod("abs", { doc: "Absolute value — folds negatives to positive." }, () => {
	return ({ in: x = 0 }) => Math.abs(x)
})
