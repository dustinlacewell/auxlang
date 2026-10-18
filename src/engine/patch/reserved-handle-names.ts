/** Names the handle (patch/handle) claims for itself; module ports and group members may not use them. */
export const RESERVED_HANDLE_NAMES: ReadonlySet<string> = new Set([
	"out",
	"apply",
	"lane",
	"id",
	"seed",
	"width",
	"mod",
]);
