/** The DOM id a chapter's Section renders at, so the sidebar can link to it. */
export function chapterSectionId(idPrefix: string, title: string): string {
	return `${idPrefix}-${title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")}`;
}
