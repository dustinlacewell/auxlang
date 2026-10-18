/** Whether `left op right` is `left`, for `&&`, `||` or `??` with a known left `v`. */
export function keepsLeft(op: string, v: unknown): boolean {
	return op === "&&" ? !v : op === "||" ? !!v : v !== undefined && v !== null;
}
