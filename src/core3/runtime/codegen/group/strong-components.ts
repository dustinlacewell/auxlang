/**
 * Strongly connected components of a directed graph (Tarjan, iterative).
 * `deps[v]` lists the nodes `v` reads from. Returns each node's component id;
 * ids are dense from 0. Pure.
 */

export function strongComponents(deps: readonly (readonly number[])[]): number[] {
	const n = deps.length;
	const index = new Array<number>(n).fill(-1);
	const low = new Array<number>(n).fill(0);
	const onStack = new Array<boolean>(n).fill(false);
	const component = new Array<number>(n).fill(-1);
	const stack: number[] = [];
	let counter = 0;
	let components = 0;

	for (let root = 0; root < n; root++) {
		if (index[root] !== -1) continue;
		const work: { v: number; next: number }[] = [{ v: root, next: 0 }];
		index[root] = low[root] = counter++;
		stack.push(root);
		onStack[root] = true;
		while (work.length > 0) {
			const frame = work[work.length - 1] as { v: number; next: number };
			const edges = deps[frame.v] as readonly number[];
			if (frame.next < edges.length) {
				const w = edges[frame.next++] as number;
				if (index[w] === -1) {
					index[w] = low[w] = counter++;
					stack.push(w);
					onStack[w] = true;
					work.push({ v: w, next: 0 });
				} else if (onStack[w]) {
					low[frame.v] = Math.min(low[frame.v] as number, index[w] as number);
				}
				continue;
			}
			work.pop();
			const parent = work[work.length - 1];
			if (parent !== undefined)
				low[parent.v] = Math.min(low[parent.v] as number, low[frame.v] as number);
			if (low[frame.v] === index[frame.v]) {
				let w: number;
				do {
					w = stack.pop() as number;
					onStack[w] = false;
					component[w] = components;
				} while (w !== frame.v);
				components++;
			}
		}
	}
	return component;
}
