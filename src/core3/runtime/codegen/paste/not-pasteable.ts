/**
 * A tick or helper the paster cannot reproduce exactly as inline code (a
 * bare use of the state object, a free name, a form outside the printer).
 * Not an error: the node keeps its call site.
 */

export class NotPasteable extends Error {}

export function refuse(reason: string): never {
	throw new NotPasteable(reason);
}
