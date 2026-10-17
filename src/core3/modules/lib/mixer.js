/**
 * Named-channel mixer: sums `ch[k] * level[k]` over an open channel group.
 * `level` mirrors `ch`'s members (`like: "ch"`) and defaults each to 1.
 */
defmod(
	"mixer",
	{
		cat: "utils",
		doc: "Sums named channels, each scaled by its own level (default 1).",
		args: ["ch"],
	},
	() => {
		return ({ ch = group(sig(0), { open: true }), level = group(unit(1), { like: "ch" }) }) => {
			let sum = 0
			for (let k = 0; k < ch.length; k++) sum += ch[k] * level[k]
			return sum
		}
	},
)
