/**
 * Render order for module-category groups across the docs. The category of a
 * module itself lives on its spec (`ModuleSpec.category`) — the registry is
 * the single source of truth; this file only says what order to show them in.
 */

import type { Category } from "@/core3/types";

export const CATEGORY_ORDER: readonly Category[] = [
	"timing",
	"sources",
	"filters",
	"envelopes",
	"effects",
	"drums",
	"bridge",
	"utils",
];
