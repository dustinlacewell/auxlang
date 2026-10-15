/**
 * A run order for the strongly connected components: every component after
 * all the components it reads from (z-reads included), and among the ready
 * ones the one holding the lowest node index first, so the order stays close
 * to program order. Returns the components, each as its node indices in
 * program order. Pure.
 */

export function orderComponents(
	deps: readonly (readonly number[])[],
	component: readonly number[],
): number[][] {
	const count = component.reduce((max, c) => Math.max(max, c + 1), 0);
	const members: number[][] = Array.from({ length: count }, () => []);
	component.forEach((c, v) => members[c]?.push(v));
	const reads: Set<number>[] = Array.from({ length: count }, () => new Set());
	deps.forEach((edges, v) => {
		const c = component[v] as number;
		for (const w of edges) if (component[w] !== c) reads[c]?.add(component[w] as number);
	});

	const done = new Set<number>();
	const order: number[][] = [];
	while (order.length < count) {
		let next = -1;
		for (let c = 0; c < count; c++) {
			if (done.has(c) || ![...(reads[c] as Set<number>)].every((r) => done.has(r))) continue;
			if (next === -1 || (members[c]?.[0] as number) < (members[next]?.[0] as number)) next = c;
		}
		done.add(next);
		order.push(members[next] as number[]);
	}
	return order;
}
