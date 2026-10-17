/** Add two signals. */
defmod("add", { doc: "Adds two signals.", args: ["to"] }, () => {
	return ({ in: x = 0, to = 0 }) => x + to
})
