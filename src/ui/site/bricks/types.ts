/**
 * The brick guide's content: chapters of bricks, one idea and one runnable
 * patch each. Each patch changes one thing from the brick before it. In
 * `text`, `backticks` mark inline code.
 */

export interface Brick {
	readonly text: string;
	readonly code: string;
	/** Open the patch graph: the brick's lesson is the patch's shape. */
	readonly graph?: true;
	/** The patch fails on purpose: the brick teaches its error. */
	readonly throws?: true;
}

export interface Chapter {
	readonly title: string;
	readonly bricks: readonly Brick[];
}
