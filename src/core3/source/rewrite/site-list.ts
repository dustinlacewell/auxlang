/**
 * The growing site table while one rewrite runs: each added site takes the
 * next id, so `sites[id].id === id`.
 */

import type { Site } from "../source-map";

export class SiteList {
	private readonly sites: Site[] = [];

	add<S extends Site>(make: (id: number) => S): S {
		const site = make(this.sites.length);
		this.sites.push(site);
		return site;
	}

	all(): readonly Site[] {
		return this.sites;
	}
}
