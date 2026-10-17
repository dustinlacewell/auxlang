import { basename } from "node:path";
import type { Plugin } from "vite";
import { metaTags } from "./meta-tags";
import { SITE_ORIGIN, SITE_PAGES } from "./site-pages";

/** Injects title + Open Graph/Twitter meta tags into each site HTML page at build/serve time. */
export function siteMetaPlugin(): Plugin {
	return {
		name: "site-meta",
		transformIndexHtml(html, ctx) {
			const file = basename(ctx.filename);
			const page = SITE_PAGES.find((p) => p.file === file);
			if (!page) {
				const known = SITE_PAGES.map((p) => p.file).join(", ");
				throw new Error(`siteMetaPlugin: no SITE_PAGES entry for "${file}" (known: ${known})`);
			}

			const tags = metaTags(page, SITE_ORIGIN);
			if (html.includes('<meta name="viewport"')) {
				return html.replace(
					/(<meta name="viewport"[^>]*>)/,
					`$1\n\t${tags.replace(/\n/g, "\n\t")}`,
				);
			}
			return html.replace("</head>", `\t${tags.replace(/\n/g, "\n\t")}\n</head>`);
		},
	};
}
