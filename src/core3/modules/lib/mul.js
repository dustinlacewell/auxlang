/** Multiply two signals. `vca` and `gain` are the amplitude-named aliases. */
for (const name of ["mul", "vca", "gain"]) {
	defmod(name, { doc: "Multiplies two signals — amplitude control and VCAs.", args: ["by"] }, () => {
		return ({ in: x = 0, by = 1 }) => x * by
	})
}
