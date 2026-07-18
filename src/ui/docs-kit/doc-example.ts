/**
 * The shared shape of one runnable documentation example: which section it lives
 * under, its title and terse description, and the real core3 patch string. Both
 * the pattern-docs and module-docs pages fill their `examples.ts` with these and
 * hold them to the same render-non-silent bar in tests.
 */

export interface DocExample {
	/** Section heading this card lives under. */
	readonly section: string;
	readonly title: string;
	readonly description: string;
	readonly code: string;
}
