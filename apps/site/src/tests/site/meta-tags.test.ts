import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { metaTags } from "@/ui/site/meta/meta-tags";
import { SITE_ORIGIN, SITE_PAGES } from "@/ui/site/meta/site-pages";

const REPO_ROOT = resolve(__dirname, "../../..");

describe("metaTags", () => {
	for (const page of SITE_PAGES) {
		it(`includes og:url, og:image, and title for ${page.file}`, () => {
			const html = metaTags(page, SITE_ORIGIN);
			expect(html).toContain(`<title>${page.title}</title>`);
			expect(html).toContain(`content="${SITE_ORIGIN}${page.path}"`);
			expect(html).toContain(`content="${SITE_ORIGIN}/og.png"`);
		});
	}

	it('escapes & < > " in title and description', () => {
		const html = metaTags(
			{ file: "x.html", path: "/x.html", title: 'a & "b"', description: "<c> & d" },
			SITE_ORIGIN,
		);
		expect(html).toContain("a &amp; &quot;b&quot;");
		expect(html).toContain("&lt;c&gt; &amp; d");
	});

	it("has a SITE_PAGES entry for every .html file at the repo root", () => {
		const htmlFiles = readdirSync(REPO_ROOT).filter((f) => f.endsWith(".html"));
		const known = new Set(SITE_PAGES.map((p) => p.file));
		for (const file of htmlFiles) {
			expect(known.has(file)).toBe(true);
		}
	});
});
