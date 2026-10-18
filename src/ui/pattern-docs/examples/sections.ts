/** Nav groups: the page's sections in reading order, clustered by concept. */
export const SECTION_GROUPS: readonly {
	label: string;
	sections: readonly { name: string; label?: string }[];
}[] = [
	{
		label: "Notation",
		sections: [
			{ name: "Sequence" },
			{ name: "Rest" },
			{ name: "[ Grouping ]" },
			{ name: "< Alternation >" },
			{ name: "[ Chords, ]" },
			{ name: "{ Polymeter }" },
			{ name: "*fast" },
			{ name: "!replicate" },
			{ name: "@hold" },
			{ name: "Ties" },
			{ name: "?probability" },
			{ name: "(euclid)" },
		],
	},
	{
		label: "Combinators",
		sections: [
			{ name: "Combinators", label: "overview" },
			{ name: "Records" },
			{ name: "Determinism" },
			{ name: "Chord vocabulary" },
			{ name: "Splicing" },
		],
	},
	{
		label: "Bridge",
		sections: [
			{ name: "Bridge: pattern as signal", label: "pattern as signal" },
			{ name: "Bridge: trigger domain", label: "trigger domain" },
		],
	},
];

/** Ordered list of section headings — drives page layout order. */
export const SECTIONS: readonly string[] = SECTION_GROUPS.flatMap((g) =>
	g.sections.map((s) => s.name),
);
