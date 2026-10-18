export type SitePage = {
	file: string;
	path: string;
	title: string;
	description: string;
};

export const SITE_ORIGIN = "https://aux.ldlework.com";

export const SITE_PAGES: readonly SitePage[] = [
	{
		file: "index.html",
		path: "/",
		title: "auxlang",
		description: "Text-based modular synthesis.",
	},
	{
		file: "editor.html",
		path: "/editor.html",
		title: "auxlang · editor",
		description: "Write a patch, hear it live, share it as a link.",
	},
	{
		file: "guide.html",
		path: "/guide.html",
		title: "auxlang · guide",
		description: "Learn auxlang one brick at a time.",
	},
	{
		file: "patterns.html",
		path: "/patterns.html",
		title: "auxlang · patterns",
		description: "The pattern language: sequences, chords, euclid rhythms, combinators.",
	},
	{
		file: "modules.html",
		path: "/modules.html",
		title: "auxlang · modules",
		description: "Every module and its ports.",
	},
	{
		file: "module-dsp.html",
		path: "/module-dsp.html",
		title: "auxlang · module dsp",
		description: "Write your own modules in JavaScript.",
	},
	{
		file: "perf.html",
		path: "/perf.html",
		title: "auxlang · perf",
		description: "Text-based modular synthesis.",
	},
];
