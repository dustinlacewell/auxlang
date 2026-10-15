/**
 * Parse each tick or helper text once per generated driver: every lane and
 * every node of a module pastes the same tree.
 */

import { type FunctionNode, parseFunction } from "../../../module/tick-subset/parse-function";
import { refuse } from "./not-pasteable";

export class ParseCache {
	private readonly trees = new Map<string, FunctionNode>();

	parse(src: string): FunctionNode {
		let tree = this.trees.get(src);
		if (tree === undefined) {
			try {
				tree = parseFunction(src, "paste").node;
			} catch {
				return refuse("source is not a function");
			}
			this.trees.set(src, tree);
		}
		return tree;
	}
}
