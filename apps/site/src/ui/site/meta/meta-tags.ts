import type { SitePage } from "./site-pages";

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

/** Builds the head HTML for a site page: title, description, Open Graph, Twitter card, canonical. */
export function metaTags(page: SitePage, origin: string): string {
	const title = escapeHtml(page.title);
	const description = escapeHtml(page.description);
	const url = escapeHtml(`${origin}${page.path}`);
	const image = escapeHtml(`${origin}/og.png`);
	const imageAlt = escapeHtml("auxlang — text-based modular synthesis");

	return `<title>${title}</title>
	<meta name="description" content="${description}">
	<meta property="og:type" content="website">
	<meta property="og:site_name" content="auxlang">
	<meta property="og:title" content="${title}">
	<meta property="og:description" content="${description}">
	<meta property="og:url" content="${url}">
	<meta property="og:image" content="${image}">
	<meta property="og:image:width" content="1200">
	<meta property="og:image:height" content="630">
	<meta property="og:image:alt" content="${imageAlt}">
	<meta name="twitter:card" content="summary_large_image">
	<meta name="twitter:title" content="${title}">
	<meta name="twitter:description" content="${description}">
	<meta name="twitter:image" content="${image}">
	<link rel="canonical" href="${url}">`;
}
