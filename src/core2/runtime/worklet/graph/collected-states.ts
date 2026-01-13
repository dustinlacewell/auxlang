/**
 * State collected from a graph for preservation during swap.
 */
export interface CollectedStates {
	/** Device state by node ID */
	nodeStates: Map<string, Record<string, unknown>>;
	/** Lambda state by "nodeId:inputName" key */
	lambdaStates: Map<string, Record<string, unknown>>;
	/** Sample count for time continuity */
	sampleCount: number;
}
